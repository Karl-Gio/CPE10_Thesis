<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            BatchSeeder::class,
            ParameterSeeder::class,
            TestingParameterSeeder::class,
            TestingParameterValueSeeder::class,
        ]);
    }
}