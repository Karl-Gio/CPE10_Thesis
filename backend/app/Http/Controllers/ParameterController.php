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
        return response()->json(
            Parameter::orderBy('created_at', 'desc')->get()
        );
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
            'Pechay_Count'        => 'nullable|integer',
            'Batch'               => 'nullable|string|max:255',
        ]);

        $parameter = Parameter::create($validated);

        return response()->json([
            'message' => 'Sensor log saved successfully',
            'data'    => $parameter
        ], 201);
    }

    /**
     * Latest reading para sa dashboard metric cards.
     */
    public function latest()
    {
        $latest = Parameter::latest()->first();

        if (!$latest) {
            return response()->json([
                'temp'            => 0,
                'hum'             => 0,
                'lux'             => 0,
                'sMOIST'          => 0,
                'sTEMP'           => 0,
                'pechay_detected' => 0,
                'batch'           => null,
                'created_at'      => null,
            ]);
        }

        return response()->json([
            'temp'            => (float) ($latest->Ambient_Temperature ?? 0),
            'hum'             => (float) ($latest->Relative_Humidity ?? 0),
            'lux'             => (float) ($latest->Light_Intensity ?? 0),
            'sMOIST'          => (float) ($latest->Soil_Moisture ?? 0),
            'sTEMP'           => (float) ($latest->Soil_Temperature ?? 0),
            'pechay_detected' => (int) ($latest->Pechay_Count ?? 0),
            'batch'           => $latest->Batch,
            'created_at'      => $latest->created_at?->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Trend data para sa dashboard chart.
     */
    public function trends()
    {
        $rows = Parameter::latest()
            ->take(20)
            ->get()
            ->sortBy('created_at')
            ->values();

        return response()->json([
            'labels' => $rows->map(function ($row) {
                return $row->created_at->format('H:i');
            })->values(),

            'temp' => $rows->map(function ($row) {
                return (float) ($row->Ambient_Temperature ?? 0);
            })->values(),

            'humidity' => $rows->map(function ($row) {
                return (float) ($row->Relative_Humidity ?? 0);
            })->values(),

            'soilMoisture' => $rows->map(function ($row) {
                return (float) ($row->Soil_Moisture ?? 0);
            })->values(),

            'soilTemp' => $rows->map(function ($row) {
                return (float) ($row->Soil_Temperature ?? 0);
            })->values(),

            'light' => $rows->map(function ($row) {
                return (float) ($row->Light_Intensity ?? 0);
            })->values(),

            'pechayCount' => $rows->map(function ($row) {
                return (int) ($row->Pechay_Count ?? 0);
            })->values(),
        ]);
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

        if (!$activeConfig) {
            return response()->json([
                'batch'         => 'Batch A',
                'ambientTemp'   => 25.00,
                'ambientHum'    => 70.00,
                'soilMoisture'  => 35.00,
                'soilTemp'      => 22.00,
                'uvStart'       => '07:00',
                'uvDuration'    => 90,
                'ledStart'      => '18:00',
                'ledDuration'   => 360,
            ]);
        }

        return response()->json([
            'batch'         => $activeConfig->batch ?? 'Batch A',
            'ambientTemp'   => (float) $activeConfig->ambientTemp,
            'ambientHum'    => (float) $activeConfig->ambientHum,
            'soilMoisture'  => (float) $activeConfig->soilMoisture,
            'soilTemp'      => (float) $activeConfig->soilTemp,
            'uvStart'       => $activeConfig->uvStart,
            'uvDuration'    => (int) $activeConfig->uvDuration,
            'ledStart'      => $activeConfig->ledStart,
            'ledDuration'   => (int) $activeConfig->ledDuration,
        ]);
    }

    /**
     * I-save ang bagong configuration at i-deactivate ang luma.
     */
    public function storeConfig(Request $request)
    {
        $validated = $request->validate([
            'batch'         => 'nullable|string|max:255',
            'ambientTemp'   => 'required|numeric',
            'ambientHum'    => 'required|numeric',
            'soilMoisture'  => 'required|numeric',
            'soilTemp'      => 'required|numeric',
            'uvStart'       => 'required|string|max:10',
            'uvDuration'    => 'required|integer|min:0',
            'ledStart'      => 'required|string|max:10',
            'ledDuration'   => 'required|integer|min:0',
        ]);

        $user = $request->user();

        $user->parameterConfigurations()->update([
            'is_active' => false
        ]);

        $newConfig = $user->parameterConfigurations()->create([
            'batch'         => $validated['batch'] ?? 'Batch A',
            'ambientTemp'   => $validated['ambientTemp'],
            'ambientHum'    => $validated['ambientHum'],
            'soilMoisture'  => $validated['soilMoisture'],
            'soilTemp'      => $validated['soilTemp'],
            'uvStart'       => $validated['uvStart'],
            'uvDuration'    => $validated['uvDuration'],
            'ledStart'      => $validated['ledStart'],
            'ledDuration'   => $validated['ledDuration'],
            'is_active'     => true,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Hardware parameters updated and saved to database.',
            'data'    => $newConfig
        ], 201);
    }
}