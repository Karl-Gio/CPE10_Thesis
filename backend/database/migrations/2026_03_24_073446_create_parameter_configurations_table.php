<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parameter_configurations', function (Blueprint $table) {
            $table->id();

            // 1. THE OWNER TAG
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 2. Sensor Thresholds (Decimal)
            $table->decimal('ambientTemp', 8, 2)->nullable();
            $table->decimal('ambientHum', 8, 2)->nullable();
            $table->decimal('soilMoisture', 8, 2)->nullable();
            $table->decimal('soilTemp', 8, 2)->nullable();
            
            // 3. Lighting Schedules (Time and Duration)
            // Ginagamit ang string/time para sa Start Time (e.g., "07:00")
            // Ginagamit ang integer para sa Duration (e.g., 90 minutes)
            $table->string('uvStart')->default('07:00');
            $table->integer('uvDuration')->default(90);
            
            $table->string('ledStart')->default('18:00');
            $table->integer('ledDuration')->default(360);
            
            // 4. Status and Timestamps
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parameter_configurations');
    }
};