const express = require("express");
const invoiceController = require("../controllers/invoice.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - items
 *               - type
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the customer
 *               items:
 *                 type: array
 *                 description: Array of invoice items
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       description: Product ID
 *                     quantity:
 *                       type: integer
 *                       description: Quantity of the product
 *               type:
 *                 type: string
 *                 enum: [CASH, UDHAAR]
 *                 description: Invoice type (CASH or UDHAAR)
 *               paid:
 *                 type: number
 *                 description: Amount already paid (optional, default 0)
 *             example:
 *               customerId: "123e4567-e89b-12d3-a456-426614174000"
 *               items:
 *                 - productId: "223e4567-e89b-12d3-a456-426614174000"
 *                   quantity: 5
 *                 - productId: "323e4567-e89b-12d3-a456-426614174000"
 *                   quantity: 2
 *               type: "CASH"
 *               paid: 500
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     customerId:
 *                       type: string
 *                     total:
 *                       type: number
 *                     paid:
 *                       type: number
 *                     due:
 *                       type: number
 *                     type:
 *                       type: string
 *                     items:
 *                       type: array
 *                     createdAt:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: customerId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [CASH, UDHAAR]
 *         description: Filter by invoice type
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *
 * /api/invoices/summary:
 *   get:
 *     summary: Get invoice summary (total, paid, due)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalInvoices:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     paidAmount:
 *                       type: number
 *                     dueAmount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 *
 * /api/invoices/{id}/payment:
 *   patch:
 *     summary: Update invoice payment
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               type:
 *                 type: string
 *                 description: Payment method (optional)
 *             example:
 *               amount: 1000
 *               type: "CASH"
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid payment data
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 */

// Create invoice
router.post("/", invoiceController.createInvoice);

// Get all invoices with filters
router.get("/", invoiceController.getInvoices);

// Get invoice summary (must be before /:id to avoid route conflicts)
router.get("/summary", invoiceController.getInvoiceSummary);

// Get invoice by ID
router.get("/:id", invoiceController.getInvoiceById);

// Update invoice payment
router.patch("/:id/payment", invoiceController.updatePayment);

// Delete invoice
router.delete("/:id", invoiceController.deleteInvoice);

module.exports = router;
