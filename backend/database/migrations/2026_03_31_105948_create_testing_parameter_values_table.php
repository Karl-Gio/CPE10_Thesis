<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testing_parameter_values', function (Blueprint $table) {
            $table->id();

            $table->foreignId('testing_parameter_id')
                ->constrained()
                ->cascadeOnDelete();

            // ACTUAL SENSOR VALUES ONLY
            $table->decimal('ambient_temp', 8, 2)->nullable();
            $table->decimal('ambient_humidity', 8, 2)->nullable();
            $table->decimal('soil_temp', 8, 2)->nullable();
            $table->decimal('soil_moisture', 8, 2)->nullable();
            $table->decimal('light_intensity', 8, 2)->nullable();

            $table->timestamp('recorded_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testing_parameter_values');
    }
};