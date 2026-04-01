<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TestingParameterSeeder extends Seeder
{
    public function run(): void
    {
        $currentTime = Carbon::now()->startOfMinute();

        $trials = [
            ['batch' => 'Trial-01', 'ambient_temp' => 22, 'ambient_humidity' => 45, 'soil_temp' => 24, 'soil_moisture' => 50, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-02', 'ambient_temp' => 18, 'ambient_humidity' => 55, 'soil_temp' => 19, 'soil_moisture' => 60, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-03', 'ambient_temp' => 27, 'ambient_humidity' => 65, 'soil_temp' => 31, 'soil_moisture' => 48, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-04', 'ambient_temp' => 20, 'ambient_humidity' => 42, 'soil_temp' => 21, 'soil_moisture' => 38, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-05', 'ambient_temp' => 31, 'ambient_humidity' => 50, 'soil_temp' => 25, 'soil_moisture' => 62, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-06', 'ambient_temp' => 25, 'ambient_humidity' => 35, 'soil_temp' => 18, 'soil_moisture' => 55, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-07', 'ambient_temp' => 19, 'ambient_humidity' => 60, 'soil_temp' => 27, 'soil_moisture' => 30, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-08', 'ambient_temp' => 30, 'ambient_humidity' => 48, 'soil_temp' => 33, 'soil_moisture' => 58, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-09', 'ambient_temp' => 28, 'ambient_humidity' => 52, 'soil_temp' => 22, 'soil_moisture' => 20, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-10', 'ambient_temp' => 32, 'ambient_humidity' => 40, 'soil_temp' => 29, 'soil_moisture' => 47, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-11', 'ambient_temp' => 21, 'ambient_humidity' => 33, 'soil_temp' => 20, 'soil_moisture' => 65, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-12', 'ambient_temp' => 24, 'ambient_humidity' => 55, 'soil_temp' => 23, 'soil_moisture' => 43, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-13', 'ambient_temp' => 26, 'ambient_humidity' => 38, 'soil_temp' => 30, 'soil_moisture' => 52, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-14', 'ambient_temp' => 23, 'ambient_humidity' => 63, 'soil_temp' => 24, 'soil_moisture' => 49, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-15', 'ambient_temp' => 22, 'ambient_humidity' => 41, 'soil_temp' => 17, 'soil_moisture' => 35, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-16', 'ambient_temp' => 29, 'ambient_humidity' => 58, 'soil_temp' => 26, 'soil_moisture' => 44, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-17', 'ambient_temp' => 17, 'ambient_humidity' => 47, 'soil_temp' => 32, 'soil_moisture' => 59, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-18', 'ambient_temp' => 31, 'ambient_humidity' => 36, 'soil_temp' => 28, 'soil_moisture' => 61, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-19', 'ambient_temp' => 20, 'ambient_humidity' => 62, 'soil_temp' => 21, 'soil_moisture' => 42, 'uv' => true, 'led' => true, 'duration' => 30],
            ['batch' => 'Trial-20', 'ambient_temp' => 33, 'ambient_humidity' => 53, 'soil_temp' => 19, 'soil_moisture' => 57, 'uv' => true, 'led' => true, 'duration' => 30],
        ];

        $rows = [];

        foreach ($trials as $trial) {
            $startTime = $currentTime->copy();

            $rows[] = [
                'batch' => $trial['batch'],
                'ambient_temp' => $trial['ambient_temp'],
                'ambient_humidity' => $trial['ambient_humidity'],
                'soil_temp' => $trial['soil_temp'],
                'soil_moisture' => $trial['soil_moisture'],
                'uv' => $trial['uv'],
                'led' => $trial['led'],
                'duration' => $trial['duration'],
                'created_at' => $startTime,
                'updated_at' => $startTime,
            ];

            // 👇 human behavior: delay or early start
            $humanDelay = rand(0, 5); // 0 min early, up to +5 min late

            $currentTime->addMinutes($trial['duration'] + $humanDelay);
        }

        DB::table('testing_parameters')->insert($rows);
    }
}