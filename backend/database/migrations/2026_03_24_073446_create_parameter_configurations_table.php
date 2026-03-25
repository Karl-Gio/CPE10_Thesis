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

            // Owner
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Current batch
            $table->string('batch')->default('Batch A');

            // Sensor thresholds
            $table->decimal('ambientTemp', 8, 2)->nullable();
            $table->decimal('ambientHum', 8, 2)->nullable();
            $table->decimal('soilMoisture', 8, 2)->nullable();
            $table->decimal('soilTemp', 8, 2)->nullable();

            // UV schedule
            $table->string('uvStart')->default('07:00');
            $table->integer('uvDuration')->default(90);

            // LED schedule
            $table->string('ledStart')->default('18:00');
            $table->integer('ledDuration')->default(360);

            // Status
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parameter_configurations');
    }
};