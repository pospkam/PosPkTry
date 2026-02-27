'use client';

import { useState } from 'react';
import { Plane, Train, Car, TreePine, Leaf, Globe } from 'lucide-react';

export function CarbonCalculator() {
  const [transport, setTransport] = useState<'plane' | 'train' | 'car'>('plane');
  const [groupSize, setGroupSize] = useState(2);
  const [co2, setCo2] = useState(150); // kg

  const handleTransportChange = (type: 'plane' | 'train' | 'car') => {
    setTransport(type);
    const multipliers = { plane: 0.5, train: 0.1, car: 0.2 };
    setCo2(groupSize * 100 * multipliers[type]);
  };

  const handleGroupSizeChange = (size: number) => {
    setGroupSize(size);
    const multipliers = { plane: 0.5, train: 0.1, car: 0.2 };
    setCo2(size * 100 * multipliers[transport]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <Globe size={24} className="text-ocean" />
        <h3 className="text-lg font-semibold text-gray-800">Углеродный след поездки</h3>
      </div>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-volcano mb-3">Транспорт до Камчатки</label>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => handleTransportChange('plane')} 
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-sm font-medium transition-all min-h-[60px] ${
                transport === 'plane' 
                  ? 'border-ocean bg-ocean/10 shadow-md text-ocean' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm text-volcano'
              }`}
            >
              <Plane size={24} />
              Самолёт
            </button>
            <button 
              onClick={() => handleTransportChange('train')} 
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-sm font-medium transition-all min-h-[60px] ${
                transport === 'train' 
                  ? 'border-ocean bg-ocean/10 shadow-md text-ocean' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm text-volcano'
              }`}
            >
              <Train size={24} />
              Поезд
            </button>
            <button 
              onClick={() => handleTransportChange('car')} 
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-sm font-medium transition-all min-h-[60px] ${
                transport === 'car' 
                  ? 'border-ocean bg-ocean/10 shadow-md text-ocean' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm text-volcano'
              }`}
            >
              <Car size={24} />
              Автомобиль
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-volcano mb-2">Размер группы</label>
          <input
            type="range"
            min="1"
            max="10"
            value={groupSize}
            onChange={(e) => handleGroupSizeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ocean [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ocean [&::-webkit-slider-thumb]:shadow-md"
          />
          <p className="text-center text-sm text-volcano mt-2 font-medium">{groupSize} человек</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-6 mb-6 text-center">
        <p className="text-4xl font-bold text-gray-800 mb-2">{Math.round(co2)} кг</p>
        <p className="text-xl text-gray-600 mb-4">CO₂</p>
        <div className="space-y-2 text-sm text-volcano">
          <div className="flex items-center justify-center gap-2">
            <TreePine size={16} />
            Нужно {Math.round(co2 / 25)} деревьев в год для поглощения
          </div>
          <div className="flex items-center justify-center gap-2">
            <Car size={16} />
            Равно {Math.round(co2 * 2)} км на автомобиле
          </div>
        </div>
      </div>
      <button className="w-full bg-moss text-white rounded-xl py-4 font-semibold text-lg hover:bg-moss/90 transition-all shadow-lg hover:shadow-xl min-h-[44px] flex items-center justify-center gap-2">
        <Leaf size={20} />
        Компенсировать CO₂
      </button>
    </div>
  );
}
