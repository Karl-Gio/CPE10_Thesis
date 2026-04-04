<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Parameter;
use App\Models\ParameterConfiguration;
use Illuminate\Http\Request;

class ParameterController extends Controller
{
    /**
     * All sensor logs.
     */
    public function index()
    {
        return response()->json(
            Parameter::with('batch')
                ->latest()
                ->get()
        );
    }

    /**
     * Save sensor log from Python / AI script.
     * Batch is resolved automatically from latest active parameter config.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ambient_temp' => 'nullable|numeric',
            'humidity' => 'nullable|numeric',
            'soil_temp' => 'nullable|numeric',
            'soil_moisture' => 'nullable|numeric',
            'light_intensity' => 'nullable|numeric',
            'pechay_count' => 'nullable|integer',
        ]);

        $activeConfig = ParameterConfiguration::with('batch')
            ->where('is_active', true)
            ->latest()
            ->first();

        if (!$activeConfig || !$activeConfig->batch_id) {
            return response()->json([
                'message' => 'No active parameter configuration with batch found.',
            ], 422);
        }

        $parameter = Parameter::create([
            'batch_id' => $activeConfig->batch_id,
            'ambient_temp' => $validated['ambient_temp'] ?? null,
            'humidity' => $validated['humidity'] ?? null,
            'soil_temp' => $validated['soil_temp'] ?? null,
            'soil_moisture' => $validated['soil_moisture'] ?? null,
            'light_intensity' => $validated['light_intensity'] ?? null,
            'pechay_count' => $validated['pechay_count'] ?? null,
        ]);

        return response()->json([
            'message' => 'Sensor log saved successfully',
            'data' => $parameter->load('batch'),
            'active_config_id' => $activeConfig->id,
            'resolved_batch_id' => $activeConfig->batch_id,
            'resolved_batch' => $activeConfig->batch?->batch_id,
        ], 201);
    }

    /**
     * Latest reading for dashboard metric cards.
     */
    public function latest()
    {
        $latest = Parameter::with('batch')->latest()->first();

        if (!$latest) {
            return response()->json([
                'temp' => 0,
                'hum' => 0,
                'lux' => 0,
                'sMOIST' => 0,
                'sTEMP' => 0,
                'pechay_detected' => 0,
                'batch' => null,
                'batch_id' => null,
                'created_at' => null,
            ]);
        }

        return response()->json([
            'temp' => (float) ($latest->ambient_temp ?? 0),
            'hum' => (float) ($latest->humidity ?? 0),
            'lux' => (float) ($latest->light_intensity ?? 0),
            'sMOIST' => (float) ($latest->soil_moisture ?? 0),
            'sTEMP' => (float) ($latest->soil_temp ?? 0),
            'pechay_detected' => (int) ($latest->pechay_count ?? 0),
            'batch' => $latest->batch?->batch_id,
            'batch_id' => $latest->batch_id,
            'created_at' => $latest->created_at?->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Trend data for dashboard chart.
     */
    public function trends(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'nullable|exists:batches,id',
            'limit' => 'nullable|integer|min:1|max:500',
        ]);

        $user = $request->user();
        $limit = $validated['limit'] ?? 20;

        $query = Parameter::query()
            ->whereHas('batch', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });

        if (!empty($validated['batch_id'])) {
            $query->where('batch_id', $validated['batch_id']);
        }

        $rows = $query->latest()
            ->take($limit)
            ->get()
            ->sortBy('created_at')
            ->values();

        return response()->json([
            'labels' => $rows->map(fn ($row) => $row->created_at->format('H:i'))->values(),
            'temp' => $rows->map(fn ($row) => (float) ($row->ambient_temp ?? 0))->values(),
            'humidity' => $rows->map(fn ($row) => (float) ($row->humidity ?? 0))->values(),
            'soilMoisture' => $rows->map(fn ($row) => (float) ($row->soil_moisture ?? 0))->values(),
            'soilTemp' => $rows->map(fn ($row) => (float) ($row->soil_temp ?? 0))->values(),
            'light' => $rows->map(fn ($row) => (float) ($row->light_intensity ?? 0))->values(),
            'pechayCount' => $rows->map(fn ($row) => (int) ($row->pechay_count ?? 0))->values(),
        ]);
    }

    /**
     * Active config for current authenticated user.
     */
    public function showActiveConfig(Request $request)
    {
        $user = $request->user();

        $activeConfig = $user->parameterConfigurations()
            ->with('batch')
            ->where('is_active', true)
            ->latest()
            ->first();

        if (!$activeConfig) {
            return response()->json([
                'batch_id' => null,
                'batch' => null,
                'ambient_temp' => 25.00,
                'humidity' => 70.00,
                'soil_moisture' => 35.00,
                'soil_temp' => 22.00,
                'uv_start' => '07:00',
                'uv_duration' => 90,
                'led_start' => '18:00',
                'led_duration' => 360,
            ]);
        }

        return response()->json([
            'id' => $activeConfig->id,
            'batch_id' => $activeConfig->batch_id,
            'batch' => $activeConfig->batch?->batch_id,
            'ambient_temp' => (float) $activeConfig->ambient_temp,
            'humidity' => (float) $activeConfig->humidity,
            'soil_moisture' => (float) $activeConfig->soil_moisture,
            'soil_temp' => (float) $activeConfig->soil_temp,
            'uv_start' => $activeConfig->uv_start,
            'uv_duration' => (int) $activeConfig->uv_duration,
            'led_start' => $activeConfig->led_start,
            'led_duration' => (int) $activeConfig->led_duration,
        ]);
    }

    /**
     * Save new config and deactivate old active ones.
     * Incoming batch_id is the PUBLIC batch_id from UI.
     * Stored batch_id becomes the internal DB batch id.
     */
    public function storeConfig(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|exists:batches,batch_id',
            'ambient_temp' => 'required|numeric',
            'humidity' => 'required|numeric',
            'soil_moisture' => 'required|numeric',
            'soil_temp' => 'required|numeric',
            'uv_start' => 'required|string|max:10',
            'uv_duration' => 'required|integer|min:0',
            'led_start' => 'required|string|max:10',
            'led_duration' => 'required|integer|min:0',
        ]);

        $user = $request->user();

        $batch = Batch::where('batch_id', $validated['batch_id'])->firstOrFail();

        $user->parameterConfigurations()->update([
            'is_active' => false,
        ]);

        $newConfig = $user->parameterConfigurations()->create([
            'batch_id' => $batch->id,
            'ambient_temp' => $validated['ambient_temp'],
            'humidity' => $validated['humidity'],
            'soil_moisture' => $validated['soil_moisture'],
            'soil_temp' => $validated['soil_temp'],
            'uv_start' => $validated['uv_start'],
            'uv_duration' => $validated['uv_duration'],
            'led_start' => $validated['led_start'],
            'led_duration' => $validated['led_duration'],
            'is_active' => true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Hardware parameters updated and saved to database.',
            'data' => $newConfig->load('batch'),
        ], 201);
    }

    /**
     * Show latest saved config for a specific batch.
     */
    public function showBatchConfig(Request $request, $batchId)
    {
        $user = $request->user();

        $batch = Batch::where('batch_id', $batchId)->firstOrFail();

        $config = $user->parameterConfigurations()
            ->with('batch')
            ->where('batch_id', $batch->id)
            ->latest()
            ->first();

        if (!$config) {
            return response()->json([
                'message' => 'No saved configuration found for this batch.',
            ], 404);
        }

        return response()->json([
            'id' => $config->id,
            'batch_id' => $config->batch_id,
            'batch' => $config->batch?->batch_id,
            'ambient_temp' => (float) $config->ambient_temp,
            'humidity' => (float) $config->humidity,
            'soil_moisture' => (float) $config->soil_moisture,
            'soil_temp' => (float) $config->soil_temp,
            'uv_start' => $config->uv_start,
            'uv_duration' => (int) $config->uv_duration,
            'led_start' => $config->led_start,
            'led_duration' => (int) $config->led_duration,
            'is_active' => (bool) $config->is_active,
        ]);
    }

    public function publicStore(Request $request)
    {
        // 1. Failsafe: If Python sends batch_id as 0 or missing, let Laravel find the latest one
        if (!$request->filled('batch_id') || $request->batch_id == 0) {
            // Find the most recently created batch in the database
            // NOTE: Make sure your Batch model is actually named 'Batch'
            $latestBatch = \App\Models\Batch::latest('id')->first();

            if ($latestBatch) {
                // Overwrite the '0' with the actual latest batch ID
                $request->merge(['batch_id' => $latestBatch->id]);
            }
        }

        // 2. Validate the incoming data
        $validatedData = $request->validate([
            'batch_id' => 'required|integer',
            'ambient_temp' => 'required|numeric',
            'humidity' => 'required|numeric',
            'soil_temp' => 'required|numeric',
            'soil_moisture' => 'required|numeric',
            'light_intensity' => 'required|numeric',
            'pechay_count' => 'required|integer',
        ]);

        // 3. Save it to the database
        // NOTE: Make sure your parameter model is actually named 'Parameter'
        $parameter = \App\Models\Parameter::create($validatedData);

        // 4. Return a clean JSON response back to Python
        return response()->json([
            'status' => 'success',
            'message' => 'Sensor data saved successfully (Batch Auto-Assigned)!',
            'data' => $parameter
        ], 201);
    }
}