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
            'testing_parameter_id' => 'required|exists:testing_parameters,id',
            'ambient_temp_actual' => 'nullable|numeric',
            'humidity_actual' => 'nullable|numeric',
            'soil_moisture_actual' => 'nullable|numeric',
            'soil_temp_actual' => 'nullable|numeric',
            'light_intensity' => 'nullable|numeric',
            'recorded_at' => 'nullable|date',
        ]);

        $parameter = TestingParameter::findOrFail($data['testing_parameter_id']);
        $recordedAt = $data['recorded_at'] ?? now();

        $value = TestingParameterValue::create([
            'testing_parameter_id' => $parameter->id,
            'ambient_temp' => $data['ambient_temp_actual'] ?? null,
            'humidity' => $data['humidity_actual'] ?? null,
            'soil_moisture' => $data['soil_moisture_actual'] ?? null,
            'soil_temp' => $data['soil_temp_actual'] ?? null,
            'light_intensity' => $data['light_intensity'] ?? null,
            'recorded_at' => $recordedAt,
            'created_at' => $recordedAt,
            'updated_at' => $recordedAt,
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