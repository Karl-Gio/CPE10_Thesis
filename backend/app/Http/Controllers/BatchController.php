<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Parameter;
use App\Models\ParameterConfiguration;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()
                ->batches()
                ->latest()
                ->get()
        );
    }

    public function show(Request $request, $batchId)
    {
        $batch = $request->user()
            ->batches()
            ->where('batch_id', $batchId)
            ->firstOrFail();

        return response()->json($batch);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'batch_id' => 'required|unique:batches,batch_id',
            'date_planted' => 'required|date',
            'predicted_days' => 'nullable|numeric',
            'latency_ms' => 'nullable|integer',
        ]);

        $batch = $user->batches()->create($validated);

        return response()->json([
            'message' => 'Batch saved successfully!',
            'data' => $batch,
        ], 201);
    }

    public function update(Request $request, $batchId)
    {
        $batch = $request->user()
            ->batches()
            ->where('batch_id', $batchId)
            ->firstOrFail();

        $validated = $request->validate([
            'actual_germination_date' => 'required|date',
        ]);

        if (!$batch->actual_germination_date) {
            $batch->update($validated);
        }

        return response()->json([
            'message' => 'Germination date processed!',
            'data' => $batch->fresh(),
        ]);
    }

    public function publicUpdateGerminationDate(Request $request)
    {
        // 1. Failsafe: If Python sends 0, auto-assign the latest batch
        if (!$request->filled('batch_id') || $request->batch_id == 0) {
            $latestBatch = Batch::latest('id')->first();
            if ($latestBatch) {
                // Merge the custom batch_id from the latest row
                $request->merge(['batch_id' => $latestBatch->batch_id]);
            }
        }

        // 2. Validate (removed 'integer' just in case your batch_id is formatted like a string)
        $validated = $request->validate([
            'batch_id' => 'required',
            'germinated' => 'required|boolean',
        ]);

        $batch = Batch::where('batch_id', $validated['batch_id'])->firstOrFail();

        // 3. Update the date if it's currently NULL
        if ($validated['germinated'] && !$batch->actual_germination_date) {
            $batch->update([
                'actual_germination_date' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Germination date processed successfully!',
            'data' => $batch->fresh(),
        ]);
    }

    public function updateLatestGerminationDate(Request $request)
    {
        $validated = $request->validate([
            'germinated' => 'required|boolean',
        ]);

        $batch = $request->user()
            ->batches()
            ->latest()
            ->firstOrFail();

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

    public function monitoring(Request $request, $batchId)
    {
        $batch = $request->user()
        ->batches()
        ->where('batch_id', $batchId)
        ->firstOrFail();

        $config = ParameterConfiguration::where('batch_id', $batch->id)
            ->latest()
            ->first();

        $parameters = Parameter::where('batch_id', $batch->id)
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

        $ambientValues = $parameters->pluck('ambient_temp')
            ->map(fn ($v) => (float) $v)
            ->values()
            ->all();

        $humidityValues = $parameters->pluck('humidity')
            ->map(fn ($v) => (float) $v)
            ->values()
            ->all();

        $soilTempValues = $parameters->pluck('soil_temp')
            ->map(fn ($v) => (float) $v)
            ->values()
            ->all();

        $soilMoistureValues = $parameters->pluck('soil_moisture')
            ->map(fn ($v) => (float) $v)
            ->values()
            ->all();

        $ambientTest = $this->oneSampleTTest($ambientValues, (float) $config->ambient_temp);
        $humidityTest = $this->oneSampleTTest($humidityValues, (float) $config->humidity);
        $soilTempTest = $this->oneSampleTTest($soilTempValues, (float) $config->soil_temp);
        $soilMoistureTest = $this->oneSampleTTest($soilMoistureValues, (float) $config->soil_moisture);

        $pValues = collect([
            $ambientTest['p_value'],
            $humidityTest['p_value'],
            $soilTempTest['p_value'],
            $soilMoistureTest['p_value'],
        ])->filter(fn ($p) => $p !== null)->values();

        $overallPValue = $pValues->isNotEmpty()
            ? round((float) $pValues->avg(), 6)
            : null;

        $overallInterpretation = $this->interpretPValue($overallPValue);

        $history = $parameters->map(function ($p) use ($config) {
            $varianceTemp = abs((float) $p->ambient_temp - (float) $config->ambient_temp);
            $varianceHum = abs((float) $p->humidity - (float) $config->humidity);
            $varianceSoilTemp = abs((float) $p->soil_temp - (float) $config->soil_temp);
            $varianceSoilMoist = abs((float) $p->soil_moisture - (float) $config->soil_moisture);

            return [
                'timestamp' => $p->created_at,
                'ambient_temp' => (float) $p->ambient_temp,
                'humidity' => (float) $p->humidity,
                'soil_temp' => (float) $p->soil_temp,
                'soil_moisture' => (float) $p->soil_moisture,
                'light' => (float) $p->light_intensity,
                'pechay_count' => (int) $p->pechay_count,
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
                'ambientTemp' => (float) $config->ambient_temp,
                'humidity' => (float) $config->humidity,
                'soilTemp' => (float) $config->soil_temp,
                'soilMoisture' => (float) $config->soil_moisture,
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
            'history' => $history,
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