<?php

namespace App\Http\Controllers;

use App\Models\TestingParameter;
use Illuminate\Http\Request;

class TestingParameterController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'ambient_temp' => 'nullable|numeric',
            'humidity' => 'nullable|numeric',
            'soil_moisture' => 'nullable|numeric',
            'soil_temp' => 'nullable|numeric',
            'uv' => 'required|boolean',
            'led' => 'required|boolean',
            'duration' => 'nullable|integer|min:1',
        ]);

        $param = $request->user()->testingParameters()->create($data);

        return response()->json([
            'message' => 'Testing parameters saved successfully',
            'data' => $param,
        ], 201);
    }

    public function index(Request $request)
    {
        return response()->json(
            $request->user()
                ->testingParameters()
                ->with('values')
                ->latest()
                ->get()
        );
    }

    public function latest(Request $request)
    {
        return response()->json(
            $request->user()
                ->testingParameters()
                ->with('values')
                ->latest()
                ->first()
        );
    }

    public function show(Request $request, $id)
    {
        return response()->json(
            $request->user()
                ->testingParameters()
                ->with('values')
                ->findOrFail($id)
        );
    }

    public function destroy(Request $request, $id)
    {
        $testingParameter = $request->user()
            ->testingParameters()
            ->findOrFail($id);

        $testingParameter->delete();

        return response()->json([
            'message' => 'Deleted successfully',
        ]);
    }
}