<?php

namespace App\Http\Controllers;

use App\Models\TestingParameter;
use App\Models\TestingParameterValue;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TestingParameterController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'batch' => [
                'required',
                'string',
                'max:255',
                Rule::unique('testing_parameters')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user()->id);
                }),
            ],
            'ambient_temp' => 'nullable|numeric',
            'humidity' => 'nullable|numeric',
            'soil_moisture' => 'nullable|numeric',
            'soil_temp' => 'nullable|numeric',
            'uv' => 'required|boolean',
            'led' => 'required|boolean',
            'duration' => 'nullable|integer|min:1',
        ]);

        $param = DB::transaction(function () use ($request, $data) {
            $startTime = Carbon::now();

            $param = $request->user()->testingParameters()->create([
                ...$data,
                'created_at' => $startTime,
                'updated_at' => $startTime,
            ]);

            $this->generateParameterValues($param);

            return $param->load('values');
        });

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

    private function generateParameterValues(TestingParameter $parameter): void
    {
        $trialStartTime = Carbon::parse($parameter->created_at);
        $totalRows = 30;
        $durationMinutes = (int) ($parameter->duration ?? 1);

        // dynamic interval
        $intervalSeconds = ($durationMinutes * 60) / $totalRows;

        $rows = [];

        for ($i = 0; $i < $totalRows; $i++) {
            $currentTime = $trialStartTime->copy()->addSeconds((int) round($i * $intervalSeconds));

            $rows[] = [
                'testing_parameter_id' => $parameter->id,
                'ambient_temp' => $this->generateWithinRange($parameter->ambient_temp, 1.5, 20, 30),
                'humidity' => $this->generateWithinRange($parameter->humidity, 5, 40, 60),
                'soil_moisture' => $this->generateWithinRange($parameter->soil_moisture, 6, 40, 60),
                'soil_temp' => $this->generateWithinRange($parameter->soil_temp, 2, 20, 30),
                'light_intensity' => $parameter->uv ? rand(280, 333) : rand(0, 20),
                'recorded_at' => $currentTime,
                'created_at' => $currentTime,
                'updated_at' => $currentTime,
            ];
        }

        TestingParameterValue::insert($rows);
    }

    private function generateWithinRange($target, $variance, $minAllowed, $maxAllowed): float
    {
        if ($target === null) {
            return (float) $minAllowed;
        }

        $min = $target - $variance;
        $max = $target + $variance;

        $min = max($min, $minAllowed);
        $max = min($max, $maxAllowed);

        if ($min > $max) {
            $min = $minAllowed;
            $max = $maxAllowed;
        }

        return round(mt_rand((int) ($min * 100), (int) ($max * 100)) / 100, 2);
    }
}