const { Delivery, Bale } = require('../models');
const { sequelize } = require('../models');

exports.getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.findAll({
      include: [{
        model: Bale,
        as: 'bales',
        attributes: ['id', 'isOpen', 'isClosed', 'isBad', 'isReimbursed']
      }],
      order: [['deliveryDate', 'DESC']]
    });

    // Calculate stats for each delivery
    const deliveriesWithStats = deliveries.map(delivery => {
      const bales = delivery.bales || [];
      const totalBales = bales.length;
      const badBales = bales.filter(b => b.isBad).length;
      const closedBales = bales.filter(b => b.isClosed).length;
      const leftBales = totalBales - closedBales - badBales;

      return {
        ...delivery.toJSON(),
        stats: {
          total: totalBales,
          left: leftBales,
          bad: badBales
        }
      };
    });

    res.json(deliveriesWithStats);
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findByPk(id, {
      include: [{
        model: Bale,
        as: 'bales'
      }]
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json(delivery);
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createDelivery = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplier, deliveryDate, invoiceNumber, numberOfBales, paymentStatus, pricePerKg, totalKg } = req.body;

    if (!supplier || !deliveryDate || !numberOfBales) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Supplier, delivery date, and number of bales are required' });
    }

    // Create delivery
    const delivery = await Delivery.create({
      supplier,
      deliveryDate,
      invoiceNumber,
      numberOfBales,
      paymentStatus: paymentStatus || false,
      pricePerKg: pricePerKg || null,
      totalKg: totalKg || null
    }, { transaction });

    // Create all bales for this delivery
    const bales = [];
    for (let i = 0; i < numberOfBales; i++) {
      bales.push({
        deliveryId: delivery.id
      });
    }

    await Bale.bulkCreate(bales, { transaction });

    await transaction.commit();

    // Fetch the created delivery with bales
    const createdDelivery = await Delivery.findByPk(delivery.id, {
      include: [{
        model: Bale,
        as: 'bales'
      }]
    });

    res.status(201).json(createdDelivery);
  } catch (error) {
    await transaction.rollback();
    console.error('Create delivery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier, deliveryDate, invoiceNumber, paymentStatus, pricePerKg, totalKg } = req.body;

    const delivery = await Delivery.findByPk(id);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (supplier) delivery.supplier = supplier;
    if (deliveryDate) delivery.deliveryDate = deliveryDate;
    if (invoiceNumber !== undefined) delivery.invoiceNumber = invoiceNumber;
    if (paymentStatus !== undefined) delivery.paymentStatus = paymentStatus;
    if (pricePerKg !== undefined) delivery.pricePerKg = pricePerKg;
    if (totalKg !== undefined) delivery.totalKg = totalKg;

    await delivery.save();

    const updatedDelivery = await Delivery.findByPk(id, {
      include: [{
        model: Bale,
        as: 'bales'
      }]
    });

    res.json(updatedDelivery);
  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findByPk(id);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    await delivery.destroy();
    res.json({ message: 'Delivery deleted successfully' });
  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
