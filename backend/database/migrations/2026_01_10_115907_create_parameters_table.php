<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('parameters', function (Blueprint $table) {
            $table->id();

            // Batch / identification
            $table->string('Batch')->nullable();

            // Environmental readings
            $table->decimal('Ambient_Temperature', 8, 2)->nullable();
            $table->decimal('Relative_Humidity', 8, 2)->nullable();
            $table->decimal('Soil_Temperature', 8, 2)->nullable();
            $table->decimal('Soil_Moisture', 8, 2)->nullable();
            $table->decimal('Light_Intensity', 10, 2)->nullable();

            // AI prediction
            $table->integer('Pechay_Count')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parameters');
    }
};