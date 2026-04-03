<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class TestingParameterSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::find(1) ?? User::create([
            'id' => 1,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

        $currentTime = Carbon::now()->startOfMinute();

        $trials = [
            ['ambient_temp' => 22, 'humidity' => 45, 'soil_temp' => 24, 'soil_moisture' => 50, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 18, 'humidity' => 55, 'soil_temp' => 19, 'soil_moisture' => 60, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 27, 'humidity' => 65, 'soil_temp' => 31, 'soil_moisture' => 48, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 20, 'humidity' => 42, 'soil_temp' => 21, 'soil_moisture' => 38, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 31, 'humidity' => 50, 'soil_temp' => 25, 'soil_moisture' => 62, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 25, 'humidity' => 35, 'soil_temp' => 18, 'soil_moisture' => 55, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 19, 'humidity' => 60, 'soil_temp' => 27, 'soil_moisture' => 30, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 30, 'humidity' => 48, 'soil_temp' => 33, 'soil_moisture' => 58, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 28, 'humidity' => 52, 'soil_temp' => 22, 'soil_moisture' => 20, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 32, 'humidity' => 40, 'soil_temp' => 29, 'soil_moisture' => 47, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 21, 'humidity' => 33, 'soil_temp' => 20, 'soil_moisture' => 65, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 24, 'humidity' => 55, 'soil_temp' => 23, 'soil_moisture' => 43, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 26, 'humidity' => 38, 'soil_temp' => 30, 'soil_moisture' => 52, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 23, 'humidity' => 63, 'soil_temp' => 24, 'soil_moisture' => 49, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 22, 'humidity' => 41, 'soil_temp' => 17, 'soil_moisture' => 35, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 29, 'humidity' => 58, 'soil_temp' => 26, 'soil_moisture' => 44, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 17, 'humidity' => 47, 'soil_temp' => 32, 'soil_moisture' => 59, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 31, 'humidity' => 36, 'soil_temp' => 28, 'soil_moisture' => 61, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 20, 'humidity' => 62, 'soil_temp' => 21, 'soil_moisture' => 42, 'uv' => true, 'led' => true, 'duration' => 30],
            ['ambient_temp' => 33, 'humidity' => 53, 'soil_temp' => 19, 'soil_moisture' => 57, 'uv' => true, 'led' => true, 'duration' => 30],
        ];

        $rows = [];

        foreach ($trials as $trial) {
            $startTime = $currentTime->copy();

            $rows[] = [
                'user_id' => $user->id,
                'ambient_temp' => $trial['ambient_temp'],
                'humidity' => $trial['humidity'],
                'soil_temp' => $trial['soil_temp'],
                'soil_moisture' => $trial['soil_moisture'],
                'uv' => $trial['uv'],
                'led' => $trial['led'],
                'duration' => $trial['duration'],
                'created_at' => $startTime,
                'updated_at' => $startTime,
            ];

            $humanDelay = rand(0, 5);
            $currentTime->addMinutes($trial['duration'] + $humanDelay);
        }

        DB::table('testing_parameters')->insert($rows);
    }
}