import React, { useState, useEffect } from 'react';
import { deliveriesAPI, balesAPI } from '../services/api';
import { daysBetween, formatDate } from '../utils/dateUtils';

const Report = ({ onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      const [deliveriesRes, balesRes] = await Promise.all([
        deliveriesAPI.getAll(),
        balesAPI.getAll()
      ]);

      const deliveries = deliveriesRes.data;
      const bales = balesRes.data;

      // Delivery statistics
      const totalDeliveries = deliveries.length;
      const totalBales = bales.length;
      const paidDeliveries = deliveries.filter(d => d.paymentStatus).length;
      const unpaidDeliveries = totalDeliveries - paidDeliveries;

      // Bale status breakdown
      const openBales = bales.filter(b => b.isOpen && !b.isClosed);
      const closedBales = bales.filter(b => b.isClosed);
      const badBales = bales.filter(b => b.isBad);
      const reimbursedBales = bales.filter(b => b.isReimbursed);
      const badNotReimbursed = bales.filter(b => b.isBad && !b.isReimbursed);

      // Supplier analysis
      const supplierStats = {};
      deliveries.forEach(delivery => {
        if (!supplierStats[delivery.supplier]) {
          supplierStats[delivery.supplier] = {
            deliveries: 0,
            totalBales: 0,
            badBales: 0,
            openBales: 0,
            closedBales: 0
          };
        }
        const supplier = supplierStats[delivery.supplier];
        supplier.deliveries++;

        const supplierBales = delivery.bales || [];
        supplier.totalBales += supplierBales.length;
        supplier.badBales += supplierBales.filter(b => b.isBad).length;
        supplier.openBales += supplierBales.filter(b => b.isOpen && !b.isClosed).length;
        supplier.closedBales += supplierBales.filter(b => b.isClosed).length;
      });

      // Time tracking metrics
      const openBalesWithDates = openBales.filter(b => b.openedDate);
      let avgOpenTime = 0;
      if (openBalesWithDates.length > 0) {
        const totalDays = openBalesWithDates.reduce((sum, b) => {
          return sum + daysBetween(b.openedDate);
        }, 0);
        avgOpenTime = (totalDays / openBalesWithDates.length).toFixed(1);
      }

      // Bales opened in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentlyOpened = bales.filter(b => {
        if (!b.openedDate) return false;
        const openDate = new Date(b.openedDate);
        return openDate >= thirtyDaysAgo;
      });

      // Remaining in stock (not closed, not bad)
      const inStock = bales.filter(b => !b.isClosed && !b.isBad).length;

      // Calculate forecast
      const avgPerDay = recentlyOpened.length / 30;
      const daysRemaining = avgPerDay > 0 ? Math.round(inStock / avgPerDay) : 0;
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + daysRemaining);

      setReport({
        // Delivery stats
        totalDeliveries,
        totalBales,
        paidDeliveries,
        unpaidDeliveries,

        // Bale stats
        openBales: openBales.length,
        closedBales: closedBales.length,
        badBales: badBales.length,
        reimbursedBales: reimbursedBales.length,
        badNotReimbursed: badNotReimbursed,

        // Supplier stats
        supplierStats,

        // Time tracking
        avgOpenTime,
        recentlyOpened: recentlyOpened.length,
        avgPerDay: avgPerDay.toFixed(1),
        inStock,
        daysRemaining,
        forecastDate: formatDate(forecastDate)
      });

      setLoading(false);
    } catch (error) {
      console.error('Error generating report:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
          <div className="text-center py-8">Genererar rapport...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Rapport</h2>
            <p className="text-sm text-gray-600 mt-1">Genererad {formatDate(new Date())}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-semibold">Totalt leveranser</div>
            <div className="text-3xl font-bold text-blue-900">{report.totalDeliveries}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-semibold">Totalt balar</div>
            <div className="text-3xl font-bold text-green-900">{report.totalBales}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-semibold">Kvar i lager</div>
            <div className="text-3xl font-bold text-purple-900">{report.inStock}</div>
          </div>
        </div>

        {/* Time Tracking Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Tidsstatistik</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Genomsnittlig öppentid:</span> {report.avgOpenTime} dagar</p>
            <p><span className="font-semibold">Öppnade senaste 30 dagarna:</span> {report.recentlyOpened} ({report.avgPerDay}/dag)</p>
            <p><span className="font-semibold">Kvar i lager:</span> {report.inStock}</p>
            <p className="text-blue-600 font-semibold">
              Prognos: {report.daysRemaining} dagar kvar — beräknat slut {report.forecastDate}
            </p>
          </div>
        </div>

        {/* Bale Status Breakdown */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Balstatus</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600">Öppna</div>
              <div className="text-2xl font-bold text-blue-600">{report.openBales}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600">Stängda</div>
              <div className="text-2xl font-bold text-gray-600">{report.closedBales}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600">Felaktiga</div>
              <div className="text-2xl font-bold text-red-600">{report.badBales}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600">Ersatta</div>
              <div className="text-2xl font-bold text-green-600">{report.reimbursedBales}</div>
            </div>
          </div>
        </div>

        {/* Bad Bales Not Reimbursed */}
        {report.badNotReimbursed.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-bold text-red-800 mb-3">Felaktiga (ej ersatta)</h3>
            <div className="space-y-1">
              {report.badNotReimbursed.map(bale => (
                <div key={bale.id} className="text-sm text-red-700">
                  Bal #{bale.id} ({bale.delivery?.supplier}, {formatDate(bale.delivery?.deliveryDate)})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Betalningsstatus</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600">Betalda leveranser</div>
              <div className="text-2xl font-bold text-green-600">{report.paidDeliveries}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600">Obetalda leveranser</div>
              <div className="text-2xl font-bold text-yellow-600">{report.unpaidDeliveries}</div>
            </div>
          </div>
        </div>

        {/* Supplier Analysis */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Leverantörsanalys</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Leverantör</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Leveranser</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Totalt balar</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Öppna</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stängda</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Felaktiga</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(report.supplierStats).map(([supplier, stats]) => (
                  <tr key={supplier} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{supplier}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{stats.deliveries}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{stats.totalBales}</td>
                    <td className="px-4 py-2 text-sm text-blue-600">{stats.openBales}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{stats.closedBales}</td>
                    <td className="px-4 py-2 text-sm text-red-600">{stats.badBales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};

export default Report;
