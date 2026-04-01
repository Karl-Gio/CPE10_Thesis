<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TestingParameterValueSeeder extends Seeder
{
    public function run(): void
    {
        $parameters = DB::table('testing_parameters')->orderBy('id')->get();
        $rows = [];

        foreach ($parameters as $parameter) {
            $trialStartTime = Carbon::parse($parameter->created_at);

            for ($minute = 0; $minute < $parameter->duration; $minute++) {
                $currentTime = $trialStartTime->copy()->addMinutes($minute);

                $rows[] = [
                    'testing_parameter_id' => $parameter->id,

                    'ambient_temp' => $this->generateWithinRange($parameter->ambient_temp, 1.5, 20, 30),
                    'ambient_humidity' => $this->generateWithinRange($parameter->ambient_humidity, 5, 40, 60),
                    'soil_moisture' => $this->generateWithinRange($parameter->soil_moisture, 6, 40, 60),
                    'soil_temp' => $this->generateWithinRange($parameter->soil_temp, 2, 20, 30),

                    'light_intensity' => $parameter->uv ? rand(280, 333) : rand(0, 20),

                    'recorded_at' => $currentTime,
                    'created_at' => $currentTime,
                    'updated_at' => $currentTime,
                ];
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('testing_parameter_values')->insert($chunk);
        }
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