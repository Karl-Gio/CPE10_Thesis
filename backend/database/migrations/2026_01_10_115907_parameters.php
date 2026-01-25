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

            // 2. Parameter Name
            $table->string('Batch')->nullable()->after('id');
            $table->decimal('Ambient_Temperature', 8, 2)->nullable();
            $table->decimal('Relative_Humidity', 8, 2)->nullable();
            $table->decimal('Soil_Temperature', 8, 2)->nullable();
            $table->decimal('Soil_Moisture', 8, 2)->nullable();
            $table->decimal('Soil_pH', 8, 2)->nullable();
            $table->decimal('Light_Intensity', 8, 2)->nullable();
            $table->decimal('Pechay_Count', 8, 2)->default(0);

            // 3. Timestamps
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