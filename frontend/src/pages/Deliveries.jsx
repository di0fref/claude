import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveriesAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import CostPrediction from '../components/CostPrediction';
import Report from '../components/Report';
import { formatDate } from '../utils/dateUtils';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCostPrediction, setShowCostPrediction] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    deliveryDate: '',
    invoiceNumber: '',
    numberOfBales: '',
    paymentStatus: false,
    pricePerKg: '',
    totalKg: ''
  });
  const navigate = useNavigate();
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await deliveriesAPI.getAll();
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await deliveriesAPI.create(formData);
      setShowModal(false);
      setFormData({
        supplier: '',
        deliveryDate: '',
        invoiceNumber: '',
        numberOfBales: '',
        paymentStatus: false,
        pricePerKg: '',
        totalKg: ''
      });
      fetchDeliveries();
    } catch (error) {
      console.error('Error creating delivery:', error);
      alert('Failed to create delivery');
    }
  };

  const handleTogglePayment = async (delivery) => {
    try {
      await deliveriesAPI.update(delivery.id, {
        paymentStatus: !delivery.paymentStatus
      });
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this delivery and all its bales?')) {
      try {
        await deliveriesAPI.delete(id);
        fetchDeliveries();
      } catch (error) {
        console.error('Error deleting delivery:', error);
      }
    }
  };

  const handleInvoiceUpload = async (deliveryId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    // Validate file size (8MB limit)
    const maxSize = 8 * 1024 * 1024; // 8MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File size (${fileSizeMB} MB) exceeds the maximum allowed size of 8 MB`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('invoice', file);
      await deliveriesAPI.uploadInvoice(deliveryId, formData);
      fetchDeliveries();
      // Reset the file input
      if (fileInputRefs.current[deliveryId]) {
        fileInputRefs.current[deliveryId].value = '';
      }
    } catch (error) {
      console.error('Error uploading invoice:', error);
      alert('Failed to upload invoice');
    }
  };

  const handleInvoiceDelete = async (deliveryId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deliveriesAPI.deleteInvoice(deliveryId);
        fetchDeliveries();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Deliveries</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowReport(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-sm sm:text-base"
          >
            Rapport
          </button>
          <button
            onClick={() => setShowCostPrediction(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm sm:text-base"
          >
            Cost Prediction
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm sm:text-base"
          >
            + Add Delivery
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bales (Total/Left/Bad)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deliveries.map((delivery) => (
              <tr
                key={delivery.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/deliveries/${delivery.id}/bales`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {delivery.supplier}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(delivery.deliveryDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                  {delivery.invoicePath ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={delivery.invoicePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View PDF
                      </a>
                      <button
                        onClick={() => handleInvoiceDelete(delivery.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="application/pdf"
                        ref={(el) => (fileInputRefs.current[delivery.id] = el)}
                        onChange={(e) => handleInvoiceUpload(delivery.id, e)}
                        className="hidden"
                        id={`invoice-upload-${delivery.id}`}
                      />
                      <label
                        htmlFor={`invoice-upload-${delivery.id}`}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded cursor-pointer"
                      >
                        Upload PDF
                      </label>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {delivery.stats.total} / {delivery.stats.left} / {delivery.stats.bad}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                  <StatusBadge
                    status={delivery.paymentStatus ? 'paid' : 'unpaid'}
                    active={delivery.paymentStatus}
                    onClick={() => handleTogglePayment(delivery)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDelete(delivery.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="bg-white shadow-md rounded-lg p-4"
            onClick={() => navigate(`/deliveries/${delivery.id}/bales`)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-gray-800">{delivery.supplier}</h3>
              <StatusBadge
                status={delivery.paymentStatus ? 'paid' : 'unpaid'}
                active={delivery.paymentStatus}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePayment(delivery);
                }}
              />
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-semibold">Date:</span> {formatDate(delivery.deliveryDate)}</p>
              <div onClick={(e) => e.stopPropagation()}>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Invoice:</span>
                  {delivery.invoicePath ? (
                    <>
                      <a
                        href={delivery.invoicePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View PDF
                      </a>
                      <button
                        onClick={() => handleInvoiceDelete(delivery.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="application/pdf"
                        ref={(el) => (fileInputRefs.current[delivery.id] = el)}
                        onChange={(e) => handleInvoiceUpload(delivery.id, e)}
                        className="hidden"
                        id={`invoice-upload-mobile-${delivery.id}`}
                      />
                      <label
                        htmlFor={`invoice-upload-mobile-${delivery.id}`}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded cursor-pointer"
                      >
                        Upload PDF
                      </label>
                    </>
                  )}
                </p>
              </div>
              <p><span className="font-semibold">Bales:</span> {delivery.stats.total} total, {delivery.stats.left} left, {delivery.stats.bad} bad</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(delivery.id);
              }}
              className="mt-3 text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Add Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Add New Delivery</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Supplier *
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Number of Bales *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfBales}
                  onChange={(e) => setFormData({ ...formData, numberOfBales: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Total Kg
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalKg}
                  onChange={(e) => setFormData({ ...formData, totalKg: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3"
                  placeholder="Total weight in kg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Price per Kg
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePerKg}
                  onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3"
                  placeholder="Price per kg"
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-700 text-sm font-bold">Paid</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost Prediction Modal */}
      {showCostPrediction && (
        <CostPrediction onClose={() => setShowCostPrediction(false)} />
      )}

      {/* Report Modal */}
      {showReport && (
        <Report onClose={() => setShowReport(false)} />
      )}
    </div>
  );
};

export default Deliveries;
