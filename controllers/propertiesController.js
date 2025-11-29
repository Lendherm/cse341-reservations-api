const Property = require('../models/Property');

// controllers/propertiesController.js - Corregir getAllProperties

const getAllProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { city, country, minPrice, maxPrice, minCapacity } = req.query;

    // Construir filtro base
    let filter = { isActive: true };

    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (country) filter['address.country'] = new RegExp(country, 'i');
    
    // Filtro para capacidad mínima
    if (minCapacity) {
      filter['rooms.capacity'] = { $gte: parseInt(minCapacity) };
    }

    // Filtro para precio - versión simplificada
    let priceFilter = {};
    if (minPrice || maxPrice) {
      priceFilter = {
        'rooms.pricePerNight': {
          ...(minPrice && { $gte: parseFloat(minPrice) }),
          ...(maxPrice && { $lte: parseFloat(maxPrice) })
        }
      };
    }

    // Pipeline de agregación corregido
    const aggregationPipeline = [
      { $match: filter },
      
      // Solo desenrollar si hay filtros de precio
      ...(Object.keys(priceFilter).length > 0 ? [
        { $unwind: '$rooms' },
        { $match: priceFilter },
        {
          $group: {
            _id: '$_id',
            doc: { $first: '$$ROOT' },
            matchingRooms: { $push: '$rooms' }
          }
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$doc', { rooms: '$matchingRooms' }]
            }
          }
        }
      ] : []),
      
      // Paginación
      { $skip: skip },
      { $limit: limit },
      
      // Populate del owner
      {
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerInfo'
        }
      },
      {
        $addFields: {
          ownerDetails: { $arrayElemAt: ['$ownerInfo', 0] }
        }
      },
      { $project: { ownerInfo: 0 } }
    ];

    // Para contar el total correctamente
    let countFilter = { ...filter };
    if (Object.keys(priceFilter).length > 0) {
      // Si hay filtro de precio, necesitamos contar después de aplicar el filtro
      const countPipeline = [
        { $match: filter },
        { $unwind: '$rooms' },
        { $match: priceFilter },
        { $group: { _id: '$_id' } },
        { $count: 'total' }
      ];
      
      const countResult = await Property.aggregate(countPipeline);
      var total = countResult[0] ? countResult[0].total : 0;
    } else {
      var total = await Property.countDocuments(filter);
    }

    const properties = await Property.aggregate(aggregationPipeline);

    res.json({
      success: true,
      count: properties.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: properties
    });

  } catch (error) {
    console.error('Get all properties error:', error);
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerId', 'name email');

    if (!property)
      return res.status(404).json({ success: false, message: 'Property not found' });

    if (!property.isActive)
      return res.status(404).json({ success: false, message: 'Property is not active' });

    res.json({ success: true, data: property });

  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const property = new Property(req.body);
    const saved = await property.save();

    await saved.populate('ownerId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: saved
    });

  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const updated = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true, context: 'query' }
    ).populate('ownerId', 'name email');

    if (!updated)
      return res.status(404).json({ success: false, message: 'Property not found' });

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updated
    });

  } catch (error) {
    next(error);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!property)
      return res.status(404).json({ success: false, message: 'Property not found' });

    res.json({
      success: true,
      message: 'Property deleted successfully',
      deletedProperty: {
        id: property._id,
        name: property.name,
        isActive: property.isActive
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty
};
