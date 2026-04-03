<?php

namespace App\Http\Controllers;

use App\Models\TestingParameter;
use App\Models\TestingParameterValue;
use Illuminate\Http\Request;

class TestingParameterValueController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'ambient_temp_target' => 'nullable|numeric',
            'humidity_target' => 'nullable|numeric',
            'soil_moisture_target' => 'nullable|numeric',
            'soil_temp_target' => 'nullable|numeric',

            'uv' => 'nullable|boolean',
            'led' => 'nullable|boolean',
            'duration' => 'nullable|integer|min:1',

            'ambient_temp_actual' => 'nullable|numeric',
            'humidity_actual' => 'nullable|numeric',
            'soil_moisture_actual' => 'nullable|numeric',
            'soil_temp_actual' => 'nullable|numeric',
            'light_intensity' => 'nullable|numeric',

            'recorded_at' => 'nullable|date',
        ]);

        $parameter = $request->user()->testingParameters()->firstOrCreate([
            'ambient_temp' => $data['ambient_temp_target'] ?? null,
            'humidity' => $data['humidity_target'] ?? null,
            'soil_moisture' => $data['soil_moisture_target'] ?? null,
            'soil_temp' => $data['soil_temp_target'] ?? null,
            'uv' => $data['uv'] ?? false,
            'led' => $data['led'] ?? false,
            'duration' => $data['duration'] ?? null,
        ]);

        $value = TestingParameterValue::create([
            'testing_parameter_id' => $parameter->id,
            'ambient_temp' => $data['ambient_temp_actual'] ?? null,
            'humidity' => $data['humidity_actual'] ?? null,
            'soil_moisture' => $data['soil_moisture_actual'] ?? null,
            'soil_temp' => $data['soil_temp_actual'] ?? null,
            'light_intensity' => $data['light_intensity'] ?? null,
            'recorded_at' => $data['recorded_at'] ?? now(),
        ]);

        return response()->json([
            'message' => 'Testing log saved successfully',
            'testing_parameter_id' => $parameter->id,
            'data' => $value,
        ], 201);
    }

    public function index(Request $request)
    {
        return response()->json(
            TestingParameterValue::whereHas('testingParameter', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->with('testingParameter')
            ->latest()
            ->get()
        );
    }

    public function latest(Request $request)
    {
        return response()->json(
            TestingParameterValue::whereHas('testingParameter', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->with('testingParameter')
            ->latest()
            ->first()
        );
    }
}