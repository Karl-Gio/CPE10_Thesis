<?php

namespace App\Http\Controllers;

use App\Models\Parameter;
use Illuminate\Http\Request;

class ParameterController extends Controller
{
    /**
     * Display a listing of the parameters (e.g., for a dashboard).
     */
    public function index()
    {
        // Get all readings, ordered by newest first
        $parameters = Parameter::orderBy('created_at', 'desc')->get();

        // Return as JSON (useful for APIs) or a View
        return response()->json($parameters);
    }

    /**
     * Store a newly created parameter in storage.
     */
    public function store(Request $request)
    {
        // 1. Validate the incoming data
        $validated = $request->validate([
            'Ambient_Temperature' => 'nullable|numeric',
            'Relative_Humidity'   => 'nullable|numeric',
            'Soil_Temperature'    => 'nullable|numeric',
            'Soil_Moisture'       => 'nullable|numeric',
            'Soil_pH'             => 'nullable|numeric',
            'Light_Intensity'     => 'nullable|numeric',
            'Germinated'          => 'nullable|boolean',
        ]);

        // 2. Create the record in the database
        $parameter = Parameter::create($validated);

        // 3. Return the created object
        return response()->json([
            'message' => 'Sensor data saved successfully',
            'data' => $parameter
        ], 201);
    }
}