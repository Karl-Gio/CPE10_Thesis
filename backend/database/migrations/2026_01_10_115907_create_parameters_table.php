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

            // RELATION
            $table->foreignId('batch_id')
                ->constrained('batches')
                ->cascadeOnDelete();

            // Environmental readings
            $table->decimal('ambient_temp', 8, 2)->nullable();
            $table->decimal('humidity', 8, 2)->nullable();
            $table->decimal('soil_temp', 8, 2)->nullable();
            $table->decimal('soil_moisture', 8, 2)->nullable();
            $table->decimal('light_intensity', 10, 2)->nullable();

            // AI prediction
            $table->integer('pechay_count')->default(0);

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