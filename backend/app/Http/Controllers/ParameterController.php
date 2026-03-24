<?php

namespace App\Http\Controllers;

use App\Models\Parameter;
use App\Models\ParameterConfiguration;
use Illuminate\Http\Request;

class ParameterController extends Controller
{
    // =========================================================================
    // PART 1: SENSOR DATA LOGGING (Galing sa Python / AI Script)
    // =========================================================================

    /**
     * Kunin ang lahat ng history ng sensor readings (para sa Tables/Charts).
     */
    public function index()
    {
        return response()->json(Parameter::orderBy('created_at', 'desc')->get());
    }

    /**
     * I-save ang sensor data at AI results (Pechay Count).
     * Ito ang tinatawag ng Python script mo tuwing magla-log.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'Ambient_Temperature' => 'nullable|numeric',
            'Relative_Humidity'   => 'nullable|numeric',
            'Soil_Temperature'    => 'nullable|numeric',
            'Soil_Moisture'       => 'nullable|numeric',
            'Light_Intensity'     => 'nullable|numeric',
            'Pechay_Count'        => 'nullable|integer', // Inalis ang sPH, pinalit ang Pechay_Count
            'Batch'               => 'nullable|string',
        ]);

        $parameter = Parameter::create($validated);

        return response()->json([
            'message' => 'Sensor log saved successfully',
            'data' => $parameter
        ], 201);
    }

    // =========================================================================
    // PART 2: PARAMETER CONFIGURATION (Galing sa React Settings Page)
    // =========================================================================

    /**
     * Ibigay ang "Active" na configuration sa React Dashboard.
     * Kung walang record, ibigay ang "Initial Values" (Defaults).
     */
    public function showActiveConfig(Request $request)
    {
        $user = $request->user();

        $activeConfig = $user->parameterConfigurations()
                             ->where('is_active', true)
                             ->latest()
                             ->first();

        // Default values kung bago pa lang ang user (Tugma sa initialValues ng React)
        if (!$activeConfig) {
            return response()->json([
                'ambientTemp'  => 25.00,
                'ambientHum'   => 70.00,
                'soilMoisture' => 35.00,
                'soilTemp'     => 22.00,
                'uvStart'      => '07:00',
                'uvDuration'   => 90,
                'ledStart'     => '18:00',
                'ledDuration'  => 360,
            ]);
        }

        // I-map ang database columns sa JSON keys na kailangan ng React
        return response()->json([
            'ambientTemp'  => (float)$activeConfig->ambientTemp,
            'ambientHum'   => (float)$activeConfig->ambientHum,
            'soilMoisture' => (float)$activeConfig->soilMoisture,
            'soilTemp'     => (float)$activeConfig->soilTemp,
            'uvStart'      => $activeConfig->uvStart,
            'uvDuration'   => (int)$activeConfig->uvDuration,
            'ledStart'     => $activeConfig->ledStart,
            'ledDuration'  => (int)$activeConfig->ledDuration,
        ]);
    }

    /**
     * I-save ang bagong configuration at i-deactivate ang luma.
     */
    public function storeConfig(Request $request)
    {
        // 1. Validation (Tugma sa keys ng React 'values' state)
        $validated = $request->validate([
            'ambientTemp'  => 'required|numeric',
            'ambientHum'   => 'required|numeric',
            'soilMoisture' => 'required|numeric',
            'soilTemp'     => 'required|numeric',
            'uvStart'      => 'required|string',   // Time (e.g., "07:00")
            'uvDuration'   => 'required|integer',  // Minutes
            'ledStart'     => 'required|string',
            'ledDuration'  => 'required|integer',
        ]);

        $user = $request->user();

        // 2. I-deactivate ang lahat ng lumang configuration para sa user na ito
        $user->parameterConfigurations()->update(['is_active' => false]);

        // 3. I-save ang bago
        $newConfig = $user->parameterConfigurations()->create([
            'ambientTemp'  => $validated['ambientTemp'],
            'ambientHum'   => $validated['ambientHum'],
            'soilMoisture' => $validated['soilMoisture'],
            'soilTemp'     => $validated['soilTemp'],
            'uvStart'      => $validated['uvStart'],
            'uvDuration'   => $validated['uvDuration'],
            'ledStart'     => $validated['ledStart'],
            'ledDuration'  => $validated['ledDuration'],
            'is_active'    => true,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Hardware parameters updated and saved to database.',
            'data'    => $newConfig
        ], 201);
    }
}