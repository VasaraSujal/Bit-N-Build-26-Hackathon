const { pool } = require('../config/database');

/**
 * Create a new document for an event
 * POST /api/events/:eventId/documents
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const createDocument = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { title, content } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Document title is required'
      });
    }

    if (title.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Document title cannot exceed 255 characters'
      });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Document content is required and cannot be empty'
      });
    }

    if (content.trim().length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Document content cannot exceed 50,000 characters'
      });
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    const result = await pool.query(
      `INSERT INTO documents (event_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING 
         id,
         event_id AS "eventId",
         title,
         content,
         uploaded_at AS "uploadedAt",
         updated_at AS "updatedAt"`,
      [eventId, trimmedTitle, trimmedContent]
    );

    return res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: {
        document: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all documents for an event (metadata only, no heavy content)
 * GET /api/events/:eventId/documents
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const listDocuments = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT 
         id,
         event_id AS "eventId",
         title,
         uploaded_at AS "uploadedAt",
         updated_at AS "updatedAt"
       FROM documents
       WHERE event_id = $1
       ORDER BY uploaded_at DESC`,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      data: {
        documents: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single document by ID (full content)
 * GET /api/events/:eventId/documents/:documentId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { eventId, documentId } = req.params;

    const result = await pool.query(
      `SELECT 
         id,
         event_id AS "eventId",
         title,
         content,
         uploaded_at AS "uploadedAt",
         updated_at AS "updatedAt"
       FROM documents
       WHERE id = $1 AND event_id = $2`,
      [documentId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        document: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update document details
 * PUT /api/events/:eventId/documents/:documentId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const updateDocument = async (req, res, next) => {
  try {
    const { eventId, documentId } = req.params;
    const { title, content } = req.body;

    const existingRes = await pool.query(
      'SELECT id, title, content FROM documents WHERE id = $1 AND event_id = $2',
      [documentId, eventId]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for this event'
      });
    }

    const currentDoc = existingRes.rows[0];

    let updatedTitle = currentDoc.title;
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Document title cannot be empty'
        });
      }
      if (title.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Document title cannot exceed 255 characters'
        });
      }
      updatedTitle = title.trim();
    }

    let updatedContent = currentDoc.content;
    if (content !== undefined) {
      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Document content cannot be empty'
        });
      }
      if (content.trim().length > 50000) {
        return res.status(400).json({
          success: false,
          message: 'Document content cannot exceed 50,000 characters'
        });
      }
      updatedContent = content.trim();
    }

    const result = await pool.query(
      `UPDATE documents
       SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND event_id = $4
       RETURNING 
         id,
         event_id AS "eventId",
         title,
         content,
         uploaded_at AS "uploadedAt",
         updated_at AS "updatedAt"`,
      [updatedTitle, updatedContent, documentId, eventId]
    );

    return res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: {
        document: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a document
 * DELETE /api/events/:eventId/documents/:documentId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { eventId, documentId } = req.params;

    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND event_id = $2 RETURNING id',
      [documentId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument
};
