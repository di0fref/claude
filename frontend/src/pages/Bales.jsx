import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { balesAPI, deliveriesAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import InlineEdit from '../components/InlineEdit';
import { formatDate, formatDateForInput, daysBetween, timeElapsed, isWinter } from '../utils/dateUtils';

const Bales = () => {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const [bales, setBales] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [settings, setSettings] = useState({ winter_warning_days: 7, summer_warning_days: 5 });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();
    fetchSettings();

    // Update time every minute for live counters
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [deliveryId]);

  const fetchData = async () => {
    try {
      if (deliveryId) {
        const [balesRes, deliveryRes] = await Promise.all([
          balesAPI.getByDelivery(deliveryId),
          deliveriesAPI.getById(deliveryId)
        ]);
        setBales(balesRes.data);
        setDelivery(deliveryRes.data);
      } else {
        const balesRes = await balesAPI.getAll();
        setBales(balesRes.data);
      }
    } catch (error) {
      console.error('Error fetching bales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await balesAPI.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleStatusToggle = async (bale, field) => {
    const newValue = !bale[field];

    // Validation: cannot be open and closed at the same time
    if (field === 'isOpen' && newValue && bale.isClosed) {
      alert('Cannot mark as open while closed. Please unmark closed first.');
      return;
    }
    if (field === 'isClosed' && newValue && bale.isOpen) {
      alert('Cannot mark as closed while open. Please unmark open first.');
      return;
    }

    try {
      await balesAPI.updateStatus(bale.id, { [field]: newValue });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDateUpdate = async (baleId, field, value) => {
    try {
      await balesAPI.updateDates(baleId, { [field]: value || null });
      fetchData();
    } catch (error) {
      console.error('Error updating date:', error);
    }
  };

  const handlePredictWarm = async (baleId) => {
    try {
      await balesAPI.predictWarmDate(baleId);
      // Refresh the bales list to get updated prediction
      fetchData();
    } catch (error) {
      console.error('Error predicting warm date:', error);
      alert('Kunde inte hämta prognos från SMHI');
    }
  };

  const handleUpdateAllPredictions = async () => {
    if (!window.confirm('Uppdatera prognoser för alla öppna balar från SMHI?')) {
      return;
    }
    try {
      const response = await balesAPI.updateAllPredictions();
      alert(`${response.data.updated} prognoser uppdaterade`);
      fetchData();
    } catch (error) {
      console.error('Error updating predictions:', error);
      alert('Kunde inte uppdatera prognoser');
    }
  };

  const getWarningStatus = (bale) => {
    if (!bale.isOpen || bale.isClosed) return null;

    const daysOpen = daysBetween(bale.openedDate);
    const warningDays = isWinter()
      ? parseInt(settings.winter_warning_days)
      : parseInt(settings.summer_warning_days);

    if (daysOpen >= warningDays) {
      return 'danger';
    } else if (daysOpen >= warningDays - 2) {
      return 'warning';
    }
    return null;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/deliveries')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Deliveries
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            {delivery ? `Bales for ${delivery.supplier}` : 'All Bales'}
          </h1>
          {delivery && (
            <p className="text-gray-600">Delivery Date: {formatDate(delivery.deliveryDate)}</p>
          )}
        </div>
        <button
          onClick={handleUpdateAllPredictions}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          title="Uppdatera prognoser för alla öppna balar från SMHI"
        >
          Uppdatera alla prognoser
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closed Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warm Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp (°C)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Elapsed</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prognos</th>
              {!deliveryId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bales.map((bale) => {
              const warning = getWarningStatus(bale);
              const rowClass = warning === 'danger'
                ? 'bg-red-50'
                : warning === 'warning'
                ? 'bg-yellow-50'
                : '';

              return (
                <tr key={bale.id} className={`hover:bg-gray-50 ${rowClass}`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bale.id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge
                        status="open"
                        active={bale.isOpen}
                        onClick={() => handleStatusToggle(bale, 'isOpen')}
                      />
                      <StatusBadge
                        status="closed"
                        active={bale.isClosed}
                        onClick={() => handleStatusToggle(bale, 'isClosed')}
                      />
                      <StatusBadge
                        status="reimbursed"
                        active={bale.isReimbursed}
                        onClick={() => handleStatusToggle(bale, 'isReimbursed')}
                      />
                      <StatusBadge
                        status="bad"
                        active={bale.isBad}
                        onClick={() => handleStatusToggle(bale, 'isBad')}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <InlineEdit
                      value={formatDateForInput(bale.openedDate)}
                      onSave={(value) => handleDateUpdate(bale.id, 'openedDate', value)}
                      type="date"
                      placeholder="Set date"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <InlineEdit
                      value={formatDateForInput(bale.closedDate)}
                      onSave={(value) => handleDateUpdate(bale.id, 'closedDate', value)}
                      type="date"
                      placeholder="Set date"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className={bale.warmDate ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                      <InlineEdit
                        value={formatDateForInput(bale.warmDate)}
                        onSave={(value) => handleDateUpdate(bale.id, 'warmDate', value)}
                        type="date"
                        placeholder="Set date"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bale.warmTemperature ? (
                      <span className="font-semibold text-orange-600">{bale.warmTemperature.toFixed(1)}°C</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bale.isOpen && !bale.isClosed && bale.openedDate ? (
                      <span className={warning === 'danger' ? 'font-bold text-red-600' : warning === 'warning' ? 'font-bold text-yellow-600' : ''}>
                        {timeElapsed(bale.openedDate)}
                      </span>
                    ) : bale.openedDate && bale.closedDate ? (
                      <span className="text-gray-600">{timeElapsed(bale.openedDate, bale.closedDate)}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {bale.isOpen && bale.openedDate && !bale.warmDate ? (
                      <>
                        {bale.predictedWarmDate ? (
                          <div className="text-xs">
                            <span className="text-orange-600 font-semibold">
                              ~{formatDate(bale.predictedWarmDate)}
                            </span>
                            <button
                              onClick={() => handlePredictWarm(bale.id)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="Uppdatera prognos"
                            >
                              ↻
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePredictWarm(bale.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Hämta prognos
                          </button>
                        )}
                      </>
                    ) : bale.warmDate ? (
                      <span className="text-gray-500 text-xs">Redan varm</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  {!deliveryId && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bale.delivery?.supplier}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden space-y-4">
        {bales.map((bale) => {
          const warning = getWarningStatus(bale);
          const cardClass = warning === 'danger'
            ? 'border-2 border-red-500'
            : warning === 'warning'
            ? 'border-2 border-yellow-500'
            : '';

          return (
            <div key={bale.id} className={`bg-white shadow-md rounded-lg p-4 ${cardClass}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-800">Bale #{bale.id}</h3>
                {warning && (
                  <span className={`text-xs px-2 py-1 rounded ${warning === 'danger' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {warning === 'danger' ? 'OVERDUE' : 'WARNING'}
                  </span>
                )}
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Status:</p>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge
                    status="open"
                    active={bale.isOpen}
                    onClick={() => handleStatusToggle(bale, 'isOpen')}
                  />
                  <StatusBadge
                    status="closed"
                    active={bale.isClosed}
                    onClick={() => handleStatusToggle(bale, 'isClosed')}
                  />
                  <StatusBadge
                    status="reimbursed"
                    active={bale.isReimbursed}
                    onClick={() => handleStatusToggle(bale, 'isReimbursed')}
                  />
                  <StatusBadge
                    status="bad"
                    active={bale.isBad}
                    onClick={() => handleStatusToggle(bale, 'isBad')}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Opened:</span>{' '}
                  <InlineEdit
                    value={formatDateForInput(bale.openedDate)}
                    onSave={(value) => handleDateUpdate(bale.id, 'openedDate', value)}
                    type="date"
                    placeholder="Set date"
                  />
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Closed:</span>{' '}
                  <InlineEdit
                    value={formatDateForInput(bale.closedDate)}
                    onSave={(value) => handleDateUpdate(bale.id, 'closedDate', value)}
                    type="date"
                    placeholder="Set date"
                  />
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Warm Date:</span>{' '}
                  <span className={bale.warmDate ? 'text-red-600 font-semibold' : ''}>
                    <InlineEdit
                      value={formatDateForInput(bale.warmDate)}
                      onSave={(value) => handleDateUpdate(bale.id, 'warmDate', value)}
                      type="date"
                      placeholder="Set date"
                    />
                  </span>
                </div>
                {bale.warmTemperature && (
                  <div>
                    <span className="font-semibold text-gray-700">Temp:</span>{' '}
                    <span className="font-semibold text-orange-600">{bale.warmTemperature.toFixed(1)}°C</span>
                  </div>
                )}
                {bale.isOpen && !bale.isClosed && bale.openedDate && (
                  <div>
                    <span className="font-semibold text-gray-700">Time Elapsed:</span>{' '}
                    <span className={warning === 'danger' ? 'font-bold text-red-600' : warning === 'warning' ? 'font-bold text-yellow-600' : ''}>
                      {timeElapsed(bale.openedDate)}
                    </span>
                  </div>
                )}
                {bale.isOpen && bale.openedDate && !bale.warmDate && (
                  <div>
                    <span className="font-semibold text-gray-700">Prognos:</span>{' '}
                    {bale.predictedWarmDate ? (
                      <>
                        <span className="text-orange-600 font-semibold">
                          ~{formatDate(bale.predictedWarmDate)}
                        </span>
                        <button
                          onClick={() => handlePredictWarm(bale.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="Uppdatera prognos"
                        >
                          ↻
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handlePredictWarm(bale.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Hämta prognos
                      </button>
                    )}
                  </div>
                )}
                {!deliveryId && bale.delivery && (
                  <div>
                    <span className="font-semibold text-gray-700">Supplier:</span> {bale.delivery.supplier}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {bales.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No bales found
        </div>
      )}
    </div>
  );
};

export default Bales;
