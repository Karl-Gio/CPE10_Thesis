<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use Illuminate\Http\Request;
use App\Models\Parameter;
use App\Models\ParameterConfiguration;

class BatchController extends Controller
{
    public function index()
    {
        return response()->json(Batch::all());
    }

    public function show($batch_id)
    {
        $batch = Batch::where('batch_id', $batch_id)->firstOrFail();
        return response()->json($batch);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_id'       => 'required|unique:batches,batch_id',
            'date_planted'   => 'required|date',
            'predicted_days' => 'required|numeric',
            'latency_ms'     => 'nullable|integer',
        ]);

        $batch = Batch::create($validated);

        return response()->json([
            'message' => 'Batch saved successfully!',
            'data'    => $batch,
        ], 201);
    }

    public function update(Request $request, $batch_id)
    {
        $batch = Batch::where('batch_id', $batch_id)->firstOrFail();

        $validated = $request->validate([
            'actual_germination_date' => 'required|date',
        ]);

        if (!$batch->actual_germination_date) {
            $batch->update($validated);
        }

        return response()->json([
            'message' => 'Germination date processed!',
            'data'    => $batch->fresh(),
        ]);
    }

    public function updateLatestGerminationDate(Request $request)
    {
        $validated = $request->validate([
            'germinated' => 'required|boolean',
        ]);

        $batch = Batch::orderByDesc('created_at')->firstOrFail();

        if ($validated['germinated'] && !$batch->actual_germination_date) {
            $batch->update([
                'actual_germination_date' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Latest batch germination date processed!',
            'data' => $batch->fresh(),
        ]);
    }

    public function monitoring($batch_id)
    {
        $batch = Batch::where('batch_id', $batch_id)->firstOrFail();

        $config = ParameterConfiguration::where('batch', $batch_id)->latest()->first();

        $parameters = Parameter::where('Batch', $batch_id)
            ->orderBy('created_at', 'asc')
            ->get();

        if (!$config) {
            return response()->json([
                'batch_id' => $batch->batch_id,
                'date_planted' => $batch->date_planted,
                'germination_date' => $batch->actual_germination_date,
                'target' => null,
                'ttest' => null,
                'overall_p_value' => null,
                'overall_interpretation' => 'Unknown',
                'history' => [],
            ]);
        }

        $ambientValues = $parameters->pluck('Ambient_Temperature')
            ->map(fn($v) => (float) $v)
            ->values()
            ->all();

        $humidityValues = $parameters->pluck('Relative_Humidity')
            ->map(fn($v) => (float) $v)
            ->values()
            ->all();

        $soilTempValues = $parameters->pluck('Soil_Temperature')
            ->map(fn($v) => (float) $v)
            ->values()
            ->all();

        $soilMoistureValues = $parameters->pluck('Soil_Moisture')
            ->map(fn($v) => (float) $v)
            ->values()
            ->all();

        $ambientTest = $this->oneSampleTTest($ambientValues, (float) $config->ambientTemp);
        $humidityTest = $this->oneSampleTTest($humidityValues, (float) $config->ambientHum);
        $soilTempTest = $this->oneSampleTTest($soilTempValues, (float) $config->soilTemp);
        $soilMoistureTest = $this->oneSampleTTest($soilMoistureValues, (float) $config->soilMoisture);

        $pValues = collect([
            $ambientTest['p_value'],
            $humidityTest['p_value'],
            $soilTempTest['p_value'],
            $soilMoistureTest['p_value'],
        ])->filter(fn($p) => $p !== null)->values();

        $overallPValue = $pValues->isNotEmpty()
            ? round((float) $pValues->avg(), 6)
            : null;

        $overallInterpretation = $this->interpretPValue($overallPValue);

        $data = $parameters->map(function ($p) use ($config) {
            $varianceTemp = abs((float) $p->Ambient_Temperature - (float) $config->ambientTemp);
            $varianceHum = abs((float) $p->Relative_Humidity - (float) $config->ambientHum);
            $varianceSoilTemp = abs((float) $p->Soil_Temperature - (float) $config->soilTemp);
            $varianceSoilMoist = abs((float) $p->Soil_Moisture - (float) $config->soilMoisture);

            return [
                'timestamp' => $p->created_at,
                'ambient_temp' => (float) $p->Ambient_Temperature,
                'humidity' => (float) $p->Relative_Humidity,
                'soil_temp' => (float) $p->Soil_Temperature,
                'soil_moisture' => (float) $p->Soil_Moisture,
                'light' => (float) $p->Light_Intensity,
                'pechay_count' => (float) $p->Pechay_Count,

                'variance' => [
                    'temp' => round($varianceTemp, 6),
                    'humidity' => round($varianceHum, 6),
                    'soil_temp' => round($varianceSoilTemp, 6),
                    'soil_moisture' => round($varianceSoilMoist, 6),
                ],
            ];
        });

        return response()->json([
            'batch_id' => $batch->batch_id,
            'date_planted' => $batch->date_planted,
            'germination_date' => $batch->actual_germination_date,

            'target' => [
                'ambientTemp' => (float) $config->ambientTemp,
                'humidity' => (float) $config->ambientHum,
                'soilTemp' => (float) $config->soilTemp,
                'soilMoisture' => (float) $config->soilMoisture,
            ],

            'ttest' => [
                'ambient_temp' => [
                    't_stat' => $ambientTest['t_stat'],
                    'p_value' => $ambientTest['p_value'],
                    'interpretation' => $this->interpretPValue($ambientTest['p_value']),
                ],
                'humidity' => [
                    't_stat' => $humidityTest['t_stat'],
                    'p_value' => $humidityTest['p_value'],
                    'interpretation' => $this->interpretPValue($humidityTest['p_value']),
                ],
                'soil_temp' => [
                    't_stat' => $soilTempTest['t_stat'],
                    'p_value' => $soilTempTest['p_value'],
                    'interpretation' => $this->interpretPValue($soilTempTest['p_value']),
                ],
                'soil_moisture' => [
                    't_stat' => $soilMoistureTest['t_stat'],
                    'p_value' => $soilMoistureTest['p_value'],
                    'interpretation' => $this->interpretPValue($soilMoistureTest['p_value']),
                ],
            ],

            'overall_p_value' => $overallPValue,
            'overall_interpretation' => $overallInterpretation,
            'history' => $data,
        ]);
    }

    private function oneSampleTTest(array $values, float $targetMean): array
    {
        $n = count($values);

        if ($n < 2) {
            return [
                't_stat' => null,
                'p_value' => null,
            ];
        }

        $mean = array_sum($values) / $n;

        $sumSquaredDiff = 0.0;
        foreach ($values as $value) {
            $sumSquaredDiff += pow($value - $mean, 2);
        }

        $sampleVariance = $sumSquaredDiff / ($n - 1);
        $stdDev = sqrt($sampleVariance);

        if ($stdDev == 0.0) {
            return [
                't_stat' => 0.0,
                'p_value' => 1.0,
            ];
        }

        $tStat = ($mean - $targetMean) / ($stdDev / sqrt($n));

        $pValue = 2 * (1 - $this->normalCdf(abs($tStat)));
        $pValue = max(0.0, min(1.0, $pValue));

        return [
            't_stat' => round($tStat, 6),
            'p_value' => round($pValue, 6),
        ];
    }

    private function interpretPValue(?float $pValue): string
    {
        if ($pValue === null) {
            return 'Unknown';
        }

        $pValue = (float) $pValue;

        if ($pValue >= 0.10) {
            return 'Excellent';
        } elseif ($pValue >= 0.05) {
            return 'Very Good';
        } elseif ($pValue >= 0.01) {
            return 'Fair';
        }

        return 'Poor';
    }

    private function normalCdf(float $x): float
    {
        return 0.5 * (1 + $this->erf($x / sqrt(2)));
    }

    private function erf(float $x): float
    {
        $sign = $x < 0 ? -1 : 1;
        $x = abs($x);

        $a1 = 0.254829592;
        $a2 = -0.284496736;
        $a3 = 1.421413741;
        $a4 = -1.453152027;
        $a5 = 1.061405429;
        $p = 0.3275911;

        $t = 1.0 / (1.0 + $p * $x);
        $y = 1.0 - (((((($a5 * $t + $a4) * $t) + $a3) * $t + $a2) * $t + $a1) * $t * exp(-$x * $x));

        return $sign * $y;
    }
}