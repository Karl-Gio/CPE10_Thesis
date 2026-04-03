<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Parameter;
use App\Models\ParameterConfiguration;
use App\Models\User;
use Carbon\Carbon;

class ParameterSeeder extends Seeder
{
    private function pickExact(array $values, int $index): float
    {
        return $values[$index % count($values)];
    }

    public function run(): void
    {
        $user = User::find(1) ?? User::create([
            'id' => 1,
            'name' => 'Karl Gio',
            'password' => bcrypt('password'),
        ]);

        $batchStartDate = Carbon::create(2026, 1, 1, 8, 0, 0);

        $dataset = [
            [1, 20, 60, 20, 45, 30, 15, 2.29],
            [2, 21, 62, 21, 46, 60, 14, 2.14],
            [3, 22, 64, 22, 47, 90, 15, 3.05],
            [4, 20, 66, 20, 48, 30, 16, 2.23],
            [5, 21, 68, 21, 49, 60, 14, 2.17],
            [6, 22, 70, 22, 50, 90, 16, 2.22],

            [7, 20, 60, 20, 45, 120, 17, 2.32],
            [8, 21, 62, 21, 46, 150, 18, 3.15],
            [9, 22, 64, 22, 47, 30, 18, 2.10],
            [10, 20, 66, 20, 48, 60, 17, 2.30],
            [11, 21, 68, 21, 49, 90, 20, 2.43],
            [12, 22, 70, 22, 50, 120, 21, 2.15],

            [13, 20, 60, 20, 45, 150, 22, 2.32],
            [14, 21, 62, 21, 46, 30, 20, 2.22],
            [15, 22, 64, 22, 47, 60, 21, 2.11],
            [16, 20, 66, 20, 48, 90, 22, 3.12],
            [17, 21, 68, 21, 49, 120, 23, 2.14],
            [18, 22, 70, 22, 50, 150, 24, 2.33],

            [19, 20, 60, 20, 45, 30, 23, 2.48],
            [20, 21, 62, 21, 46, 60, 23, 2.15],
            [21, 22, 64, 22, 47, 90, 24, 2.32],
            [22, 20, 66, 20, 48, 120, 25, 2.27],
            [23, 21, 68, 21, 49, 150, 24, 2.10],
            [24, 22, 70, 22, 50, 30, 23, 2.40],

            [25, 20, 60, 20, 45, 60, 24, 2.22],
            [26, 21, 62, 21, 46, 90, 21, 2.32],
            [27, 22, 64, 22, 47, 120, 20, 3.22],
            [28, 20, 66, 20, 48, 150, 22, 2.11],
            [29, 21, 68, 21, 49, 30, 21, 2.33],
            [30, 22, 70, 22, 50, 60, 21, 2.29],
        ];

        foreach ($dataset as $row) {
            $batchName  = 'BATCH-' . str_pad($row[0], 3, '0', STR_PAD_LEFT);
            $actualDays = $row[7];

            ParameterConfiguration::create([
                'user_id'      => $user->id,
                'batch'        => $batchName,
                'ambientTemp'  => $row[1],
                'ambientHum'   => $row[2],
                'soilTemp'     => $row[3],
                'soilMoisture' => $row[4],
                'uvStart'      => '07:00',
                'uvDuration'   => (int) round($row[5]),
                'ledStart'     => '18:00',
                'ledDuration'  => (int) round($row[5]),
                'is_active'    => ($row[0] === 30),
                'created_at'   => $batchStartDate,
                'updated_at'   => $batchStartDate,
            ]);

            // EXACT actual data from your Excel
            $ambientMap = [
                20 => [20.05, 21.02, 20.14, 21.04, 19.95, 20.01, 21.08, 20.06, 20.20, 19.67],
                21 => [21.01, 21.18, 21.16, 20.99, 21.02, 21.07, 20.96, 21.10, 21.24, 20.95],
                22 => [21.92, 22.04, 21.95, 21.98, 22.01, 21.93, 21.97, 21.94, 22.03, 21.96],
            ];

            $humidityMap = [
                60 => [60.02, 60.01, 60.00, 59.99, 59.99, 59.98, 59.98, 59.97, 59.97, 59.97],
                62 => [62.18, 61.95, 62.12, 62.01, 62.25, 61.92, 62.15, 61.88, 62.21, 61.99],
                64 => [64.05, 64.02, 63.98, 63.92, 63.90, 63.92, 63.95, 63.98, 64.02, 64.00],
                66 => [65.88, 65.95, 66.02, 66.08, 66.12, 66.15, 66.09, 66.05, 66.01, 65.98],
                68 => [67.92, 67.98, 68.05, 68.12, 68.10, 68.02, 67.95, 67.90, 67.98, 68.05],
                70 => [69.95, 70.02, 70.08, 70.12, 70.15, 70.11, 70.05, 69.98, 69.95, 69.91],
            ];

            $soilTempMap = [
                20 => [19.88, 19.95, 20.02, 20.08, 20.12, 20.15, 20.09, 20.05, 20.01, 19.98],
                21 => [20.88, 20.95, 21.02, 21.08, 21.12, 21.15, 21.09, 21.05, 21.01, 20.98],
                22 => [21.88, 21.95, 22.02, 22.08, 22.12, 22.15, 22.09, 22.05, 22.01, 21.98],
            ];

            $soilMoistureMap = [
                45 => [44.92, 44.98, 45.05, 45.12, 45.10, 45.02, 44.95, 44.90, 44.98, 45.05],
                46 => [45.98, 46.02, 46.08, 46.05, 45.95, 45.88, 45.92, 45.98, 46.02, 45.92],
                47 => [46.92, 46.98, 47.05, 47.12, 47.10, 47.02, 46.95, 46.90, 46.98, 47.05],
                48 => [47.98, 48.02, 48.08, 48.05, 47.95, 47.88, 47.92, 47.98, 48.02, 47.92],
                49 => [48.85, 48.88, 48.95, 49.02, 49.08, 49.05, 48.98, 48.90, 48.85, 48.82],
                50 => [50.02, 50.08, 50.15, 50.20, 50.12, 50.05, 49.98, 49.92, 50.00, 50.08],
            ];

            $ambientSeries      = $ambientMap[$row[1]];
            $humiditySeries     = $humidityMap[$row[2]];
            $soilTempSeries     = $soilTempMap[$row[3]];
            $soilMoistureSeries = $soilMoistureMap[$row[4]];

            $intervalMinutes = 144; // 2.4 hours
            $totalLogs = (int) ceil(($actualDays * 24 * 60) / $intervalMinutes);

            for ($logIndex = 0; $logIndex < $totalLogs; $logIndex++) {
                $logTimestamp = $batchStartDate->copy()->addMinutes($logIndex * $intervalMinutes);

                $hourOfDay = $logTimestamp->hour;
                $isPM = ($hourOfDay >= 12 && $hourOfDay < 24);
                $lightValue = $isPM ? 328 : 1;

                Parameter::create([
                    'Ambient_Temperature' => $this->pickExact($ambientSeries, $logIndex),
                    'Relative_Humidity'   => $this->pickExact($humiditySeries, $logIndex),
                    'Soil_Temperature'    => $this->pickExact($soilTempSeries, $logIndex),
                    'Soil_Moisture'       => $this->pickExact($soilMoistureSeries, $logIndex),
                    'Light_Intensity'     => $lightValue,
                    'Pechay_Count'        => ($logIndex === $totalLogs - 1) ? $row[6] : 0,
                    'Batch'               => $batchName,
                    'created_at'          => $logTimestamp,
                    'updated_at'          => $logTimestamp,
                ]);
            }

            $batchStartDate = $batchStartDate->copy()->addMinutes($totalLogs * $intervalMinutes);
        }
    }
}