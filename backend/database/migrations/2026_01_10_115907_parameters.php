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
            // 1. Primary Key
            $table->id();

            // 2. Identification (Inalis ang ->after() dahil bawal ito sa Schema::create)
            $table->string('Batch')->nullable();

            // 3. Environmental Readings (Para sa Data Logging)
            $table->decimal('Ambient_Temperature', 8, 2)->nullable();
            $table->decimal('Relative_Humidity', 8, 2)->nullable();
            $table->decimal('Soil_Temperature', 8, 2)->nullable();
            $table->decimal('Soil_Moisture', 8, 2)->nullable();
            $table->decimal('Light_Intensity', 8, 2)->nullable();
            
            // 4. AI Prediction Results
            $table->integer('Pechay_Count')->default(0);

            // 5. Timestamps (Created at / Updated at)
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