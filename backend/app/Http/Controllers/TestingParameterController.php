<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TestingParameter;
use Illuminate\Http\Request;

class TestingParameterController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'batch' => 'nullable|string|max:255',
            'ambient_temp' => 'nullable|numeric',
            'ambient_humidity' => 'nullable|numeric',
            'soil_moisture' => 'nullable|numeric',
            'soil_temp' => 'nullable|numeric',
            'uv' => 'required|boolean',
            'led' => 'required|boolean',
            'duration' => 'nullable|integer|min:1',
        ]);

        $param = TestingParameter::create($data);

        return response()->json([
            'message' => 'Parameters saved successfully',
            'data' => $param
        ]);
    }

    public function index()
    {
        return TestingParameter::latest()->get();
    }

    public function latest()
    {
        return TestingParameter::latest()->first();
    }

    public function show($id)
    {
        return TestingParameter::findOrFail($id);
    }

    public function destroy($id)
    {
        TestingParameter::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Deleted successfully'
        ]);
    }
}