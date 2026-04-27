const express = require("express");

const router = express.Router();

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization display name
 *               slug:
 *                 type: string
 *                 description: Optional unique URL slug
 *               phone:
 *                 type: string
 *                 description: Optional organization phone number
 *               address:
 *                 type: string
 *                 description: Optional organization address
 *             example:
 *               name: Huzef Traders
 *               slug: huzef-traders
 *               phone: "9876543210"
 *               address: 123 Main Bazaar, Mumbai
 *     responses:
 *       201:
 *         description: Organization created successfully
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
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         ownerId:
 *                           type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Organization slug already exists
 */

/**
 * @swagger
 * /api/organizations/{orgId}:
 *   get:
 *     summary: Get organization details
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization UUID
 *     responses:
 *       200:
 *         description: Organization retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization not found
 */

/**
 * @swagger
 * /api/organizations/{orgId}:
 *   put:
 *     summary: Update organization details
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               logo_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization not found
 */

/**
 * @swagger
 * /api/organizations/{orgId}:
 *   delete:
 *     summary: Delete an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization UUID
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization not found
 */

module.exports = router;
