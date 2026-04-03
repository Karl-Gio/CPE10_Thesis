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

        // Save only once
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

        // Get target config
        $config = ParameterConfiguration::where('batch', $batch_id)->latest()->first();

        // Get sensor history (first 10 per batch if needed)
        $parameters = Parameter::where('Batch', $batch_id)
            ->orderBy('created_at', 'asc')
            ->get();

        // Compute variance + interpretation
        $data = $parameters->map(function ($p) use ($config) {

            $varianceTemp = $config ? abs($p->Ambient_Temperature - $config->ambientTemp) : null;
            $varianceHum  = $config ? abs($p->Relative_Humidity - $config->ambientHum) : null;
            $varianceSoilTemp = $config ? abs($p->Soil_Temperature - $config->soilTemp) : null;
            $varianceSoilMoist = $config ? abs($p->Soil_Moisture - $config->soilMoisture) : null;

            // Simple interpretation logic
            $avgVariance = collect([
                $varianceTemp,
                $varianceHum,
                $varianceSoilTemp,
                $varianceSoilMoist
            ])->filter()->avg();

            $interpretation = match (true) {
                $avgVariance <= 0.1 => 'Excellent',
                $avgVariance <= 0.2 => 'Very Good',
                $avgVariance <= 0.5 => 'Good',
                default             => 'Poor',
            };

            return [
                'timestamp' => $p->created_at,
                'ambient_temp' => $p->Ambient_Temperature,
                'humidity' => $p->Relative_Humidity,
                'soil_temp' => $p->Soil_Temperature,
                'soil_moisture' => $p->Soil_Moisture,
                'light' => $p->Light_Intensity,
                'pechay_count' => $p->Pechay_Count,

                'variance' => [
                    'temp' => $varianceTemp,
                    'humidity' => $varianceHum,
                    'soil_temp' => $varianceSoilTemp,
                    'soil_moisture' => $varianceSoilMoist,
                ],

                'interpretation' => $interpretation
            ];
        });

        return response()->json([
            'batch_id' => $batch->batch_id,
            'date_planted' => $batch->date_planted,
            'germination_date' => $batch->actual_germination_date,

            'target' => $config ? [
                'ambientTemp' => $config->ambientTemp,
                'humidity' => $config->ambientHum,
                'soilTemp' => $config->soilTemp,
                'soilMoisture' => $config->soilMoisture,
            ] : null,

            'history' => $data
        ]);
    }
}