import React from 'react';

const StatusBadge = ({ status, onClick, active }) => {
  const badges = {
    open: {
      label: 'Open',
      classes: active
        ? 'bg-blue-500 text-white'
        : 'bg-blue-100 text-blue-800'
    },
    closed: {
      label: 'Closed',
      classes: active
        ? 'bg-gray-500 text-white'
        : 'bg-gray-100 text-gray-800'
    },
    reimbursed: {
      label: 'Reimbursed',
      classes: active
        ? 'bg-green-500 text-white'
        : 'bg-green-100 text-green-800'
    },
    bad: {
      label: 'Bad',
      classes: active
        ? 'bg-red-500 text-white'
        : 'bg-red-100 text-red-800'
    },
    paid: {
      label: 'Paid',
      classes: active
        ? 'bg-green-500 text-white'
        : 'bg-green-100 text-green-800'
    },
    unpaid: {
      label: 'Unpaid',
      classes: active
        ? 'bg-yellow-500 text-white'
        : 'bg-yellow-100 text-yellow-800'
    }
  };

  const badge = badges[status] || { label: status, classes: 'bg-gray-100 text-gray-800' };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.classes} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
    >
      {badge.label}
    </span>
  );
};

export default StatusBadge;
