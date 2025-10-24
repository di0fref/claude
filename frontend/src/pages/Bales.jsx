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
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

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

    try {
      // Open and closed status should toggle each other
      if (field === 'isOpen' && newValue && bale.isClosed) {
        // When opening a closed bale, clear closed status and set open
        await balesAPI.updateStatus(bale.id, { isOpen: true, isClosed: false });
        // Clear closed date and set opened date to today
        await balesAPI.updateDates(bale.id, {
          closedDate: null,
          openedDate: new Date().toISOString().split('T')[0]
        });
      } else if (field === 'isClosed' && newValue && bale.isOpen) {
        // When closing an open bale, clear open status and set closed
        await balesAPI.updateStatus(bale.id, { isOpen: false, isClosed: true });
        // Set closed date to today (keep opened date for tracking)
        await balesAPI.updateDates(bale.id, {
          closedDate: new Date().toISOString().split('T')[0]
        });
      } else {
        // Normal toggle without conflict
        await balesAPI.updateStatus(bale.id, { [field]: newValue });

        // Set or clear corresponding date
        if (newValue) {
          // Setting to true - set date to today
          if (field === 'isOpen') {
            await balesAPI.updateDates(bale.id, { openedDate: new Date().toISOString().split('T')[0] });
          } else if (field === 'isClosed') {
            await balesAPI.updateDates(bale.id, { closedDate: new Date().toISOString().split('T')[0] });
          }
        } else {
          // Setting to false - clear date
          if (field === 'isOpen' && bale.openedDate) {
            await balesAPI.updateDates(bale.id, { openedDate: null });
          } else if (field === 'isClosed' && bale.closedDate) {
            await balesAPI.updateDates(bale.id, { closedDate: null });
          }
        }
      }

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

  const handleImageUpload = async (baleId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      await balesAPI.uploadImage(baleId, formData);
      fetchData();
      alert('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.response?.data?.error || 'Failed to upload image');
    }
  };

  const handleImageDelete = async (baleId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await balesAPI.deleteImage(baleId);
      fetchData();
      alert('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert(error.response?.data?.error || 'Failed to delete image');
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

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedBales = () => {
    const sorted = [...bales].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'openedDate':
          aVal = a.openedDate ? new Date(a.openedDate).getTime() : 0;
          bVal = b.openedDate ? new Date(b.openedDate).getTime() : 0;
          break;
        case 'closedDate':
          aVal = a.closedDate ? new Date(a.closedDate).getTime() : 0;
          bVal = b.closedDate ? new Date(b.closedDate).getTime() : 0;
          break;
        case 'warmDate':
          aVal = a.warmDate ? new Date(a.warmDate).getTime() : 0;
          bVal = b.warmDate ? new Date(b.warmDate).getTime() : 0;
          break;
        case 'warmTemperature':
          aVal = a.warmTemperature || 0;
          bVal = b.warmTemperature || 0;
          break;
        case 'timeElapsed':
          aVal = a.openedDate ? daysBetween(a.openedDate) : 0;
          bVal = b.openedDate ? daysBetween(b.openedDate) : 0;
          break;
        case 'supplier':
          aVal = a.delivery?.supplier || '';
          bVal = b.delivery?.supplier || '';
          break;
        case 'status':
          // Sort by open status, then closed, then reimbursed
          aVal = (a.isOpen ? 4 : 0) + (a.isClosed ? 3 : 0) + (a.isReimbursed ? 2 : 0) + (a.isBad ? 1 : 0);
          bVal = (b.isOpen ? 4 : 0) + (b.isClosed ? 3 : 0) + (b.isReimbursed ? 2 : 0) + (b.isBad ? 1 : 0);
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  };

  const SortableHeader = ({ field, children }) => {
    const isActive = sortField === field;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
        onClick={() => handleSort(field)}
        title="Click to sort"
      >
        <div className="flex items-center gap-1">
          {children}
          <span className="text-gray-400">
            {isActive ? (
              sortDirection === 'asc' ? '▲' : '▼'
            ) : (
              '⇅'
            )}
          </span>
        </div>
      </th>
    );
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
              <SortableHeader field="id">ID</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <SortableHeader field="openedDate">Opened Date</SortableHeader>
              <SortableHeader field="closedDate">Closed Date</SortableHeader>
              <SortableHeader field="warmDate">Warm Date</SortableHeader>
              <SortableHeader field="warmTemperature">Temp (°C)</SortableHeader>
              <SortableHeader field="timeElapsed">Time Elapsed</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prognos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
              {!deliveryId && <SortableHeader field="supplier">Supplier</SortableHeader>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedBales().map((bale) => {
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {bale.imagePath ? (
                      <div className="flex items-center gap-2">
                        <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${bale.imagePath}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${bale.imagePath}`}
                            alt="Bale"
                            className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                          />
                        </a>
                        <button
                          onClick={() => handleImageDelete(bale.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Delete image"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(bale.id, e)}
                        />
                      </label>
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
        {getSortedBales().map((bale) => {
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
                <div>
                  <span className="font-semibold text-gray-700">Image:</span>{' '}
                  {bale.imagePath ? (
                    <div className="mt-2 flex items-center gap-3">
                      <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${bale.imagePath}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${bale.imagePath}`}
                          alt="Bale"
                          className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-75"
                        />
                      </a>
                      <button
                        onClick={() => handleImageDelete(bale.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 inline-block cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(bale.id, e)}
                      />
                    </label>
                  )}
                </div>
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
