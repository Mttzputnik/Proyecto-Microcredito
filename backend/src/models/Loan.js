const mongoose = require('mongoose');

/**
 * Sub-esquema para las cuotas del cronograma de pago (Embebido en Loan)
 */
const InstallmentSchema = new mongoose.Schema({
  installmentNumber: { 
    type: Number, 
    required: true 
  },
  amountDue: { 
    type: Number, 
    required: true 
  },
  principalAmount: { 
    type: Number, 
    required: true 
  },
  interestAmount: { 
    type: Number, 
    required: true 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDIENTE', 'PAGADA', 'VENCIDA'], 
    default: 'PENDIENTE' 
  },
  paidAt: { 
    type: Date, 
    default: null 
  }
});

/**
 * Sub-esquema para el historial de pagos realizados (Embebido en Loan)
 */
const PaymentSchema = new mongoose.Schema({
  installmentNumber: { 
    type: Number, 
    required: true 
  },
  amountPaid: { 
    type: Number, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ['EFECTIVO', 'TRANSFERENCIA', 'PSE', 'TARJETA']
  },
  referenceCode: { 
    type: String 
  },
  paidAt: { 
    type: Date, 
    default: Date.now 
  }
});

/**
 * Esquema Principal del Crédito (Loan)
 */
const LoanSchema = new mongoose.Schema({
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  interestRate: { 
    type: Number, 
    required: true 
  },
  termMonths: { 
    type: Number, 
    required: true 
  },
  status: {
    type: String,
    enum: ['BORRADOR', 'EN_ESTUDIO', 'APROBADO', 'RECHAZADO', 'ACTIVO', 'PAGADO', 'CASTIGADO'],
    default: 'BORRADOR'
  },
  approvedAt: { 
    type: Date 
  },
  installments: [InstallmentSchema],
  payments: [PaymentSchema]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Loan', LoanSchema);
