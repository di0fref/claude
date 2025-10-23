import React, { useState, useEffect } from 'react';
import { balesAPI, deliveriesAPI } from '../services/api';
import { daysBetween, isWinter } from '../utils/dateUtils';

const CostPrediction = ({ onClose }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgCostPerBale, setAvgCostPerBale] = useState(0);

  useEffect(() => {
    calculatePredictions();
  }, []);

  const calculatePredictions = async () => {
    try {
      const [balesResponse, deliveriesResponse] = await Promise.all([
        balesAPI.getAll(),
        deliveriesAPI.getAll()
      ]);

      const bales = balesResponse.data;
      const deliveries = deliveriesResponse.data;

      // Calculate average cost per bale from deliveries with pricing info
      const deliveriesWithCost = deliveries.filter(d => d.totalKg && d.pricePerKg && d.numberOfBales);
      let totalAvgCost = 0;
      let calculatedAvg = 0;

      if (deliveriesWithCost.length > 0) {
        deliveriesWithCost.forEach(delivery => {
          const deliveryCost = delivery.totalKg * delivery.pricePerKg;
          const costPerBale = deliveryCost / delivery.numberOfBales;
          totalAvgCost += costPerBale;
        });
        calculatedAvg = totalAvgCost / deliveriesWithCost.length;
        setAvgCostPerBale(calculatedAvg);
      }

      // Calculate consumption rate based on historical data
      const today = new Date();
      const closedBales = bales.filter(b => b.closedDate && b.openedDate);

      // Calculate total days and bales consumed
      let totalDaysOpen = 0;
      closedBales.forEach(bale => {
        const opened = new Date(bale.openedDate);
        const closed = new Date(bale.closedDate);
        const daysOpen = Math.max(1, Math.floor((closed - opened) / (1000 * 60 * 60 * 24)));
        totalDaysOpen += daysOpen;
      });

      // Calculate consumption rate (bales per day)
      const consumptionRate = closedBales.length > 0
        ? closedBales.length / totalDaysOpen
        : 0.1; // Default to 0.1 bales/day if no history

      // Calculate predictions for next 6 months
      const monthlyPredictions = [];
      const openBalesCount = bales.filter(b => !b.isClosed && !b.isBad).length;

      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthName = monthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
        const daysInMonth = monthEnd.getDate();

        // Calculate bales needed this month
        const balesNeededThisMonth = consumptionRate * daysInMonth;

        // Calculate cost for this month
        const estimatedCost = balesNeededThisMonth * calculatedAvg;

        monthlyPredictions.push({
          month: monthName,
          baleCount: Math.round(balesNeededThisMonth * 10) / 10, // Round to 1 decimal
          estimatedCost: estimatedCost,
          averageCostPerBale: calculatedAvg,
          consumptionRate: consumptionRate
        });
      }

      setPredictions(monthlyPredictions);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating predictions:', error);
      setLoading(false);
    }
  };

  const totalProjected = predictions.reduce((sum, p) => sum + p.estimatedCost, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">6-Month Cost Prediction</h2>
            <p className="text-sm text-gray-600 mt-1">Based on currently open bales</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Average Cost per Bale: <span className="text-lg font-bold text-green-600">{avgCostPerBale.toFixed(2)} kr</span>
          </div>
          {predictions.length > 0 && predictions[0].consumptionRate && (
            <div className="text-sm font-medium text-gray-700">
              Consumption Rate: <span className="text-lg font-bold text-blue-600">{(predictions[0].consumptionRate * 30).toFixed(1)} bales/month</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            Based on historical data from closed bales
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Calculating...</div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Total 6-Month Projected Cost</div>
              <div className="text-3xl font-bold text-blue-600">
                {totalProjected.toFixed(2)} kr
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Estimated {(predictions.reduce((sum, p) => sum + p.baleCount, 0)).toFixed(1)} bales needed
              </div>
            </div>

            <div className="space-y-3">
              {predictions.map((pred, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800">{pred.month}</h3>
                      <p className="text-sm text-gray-600">{pred.baleCount} bales needed</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">
                        {pred.estimatedCost.toFixed(2)} kr
                      </div>
                      {pred.averageCostPerBale > 0 && (
                        <div className="text-xs text-gray-500">
                          @ {pred.averageCostPerBale.toFixed(2)} kr/bale
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${totalProjected > 0 ? (pred.estimatedCost / totalProjected) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This prediction is based on your historical consumption rate calculated from closed bales.
                The cost per bale is averaged from all deliveries with pricing information (total kg × price per kg ÷ number of bales).
                Actual costs may vary based on price changes and consumption patterns.
              </p>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostPrediction;
