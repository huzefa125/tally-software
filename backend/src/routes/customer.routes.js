const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const customerController = require('../controllers/customer.controller');

/**
 * @openapi
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *           nullable: true
 *         balance:
 *           type: number
 *           format: float
 *         orgId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CustomerCreate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         balance:
 *           type: number
 */

router.use(authMiddleware);

/**
 * @openapi
 * /api/customers:
 *   post:
 *     tags:
 *       - Customers
 *     summary: Create a new customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerCreate'
 *     responses:
 *       '201':
 *         description: Customer created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       '400':
 *         description: Bad request
 */
router.post('/', customerController.createCustomer);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get list of customers for the authenticated user's organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 */
router.get('/', customerController.getAllCustomers);

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get a single customer by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       '404':
 *         description: Not found
 */
router.get('/:id', customerController.getCustomer);

/**
 * @openapi
 * /api/customers/{id}:
 *   put:
 *     tags:
 *       - Customers
 *     summary: Update a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerCreate'
 *     responses:
 *       '200':
 *         description: Updated customer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       '400':
 *         description: Bad request
 *       '404':
 *         description: Not found
 */
router.put('/:id', customerController.updateCustomer);

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags:
 *       - Customers
 *     summary: Delete a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Customer deleted
 *       '404':
 *         description: Not found
 */
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;