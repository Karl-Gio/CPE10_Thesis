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
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|exists:batches,id',
            'ambient_temp' => 'nullable|numeric',
            'humidity' => 'nullable|numeric',
            'soil_temp' => 'nullable|numeric',
            'soil_moisture' => 'nullable|numeric',
            'light_intensity' => 'nullable|numeric',
            'pechay_count' => 'nullable|integer',
        ]);

        $parameter = Parameter::create($validated);

        return response()->json([
            'message' => 'Sensor log saved successfully',
            'data' => $parameter->load('batch'),
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

        $limit = $validated['limit'] ?? 20;

        $query = Parameter::query()->with('batch');

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
            'batch' => $rows->isNotEmpty() ? $rows->first()->batch?->batch_id : null,
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
     */
    public function storeConfig(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'nullable|exists:batches,id',
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

        $user->parameterConfigurations()->update([
            'is_active' => false,
        ]);

        $newConfig = $user->parameterConfigurations()->create([
            'batch_id' => $validated['batch_id'] ?? null,
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
}