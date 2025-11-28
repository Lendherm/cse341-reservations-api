const Property = require('../models/Property');

// GET all properties with filtering and pagination
const getAllProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { city, country, minPrice, maxPrice, minCapacity, amenities } = req.query;
    
    // Build filter object
    let filter = { isActive: true };
    
    if (city) {
      filter['address.city'] = new RegExp(city, 'i');
    }
    
    if (country) {
      filter['address.country'] = new RegExp(country, 'i');
    }
    
    if (minCapacity) {
      filter['rooms.capacity'] = { $gte: parseInt(minCapacity) };
    }
    
    // Build price filter for aggregation
    let priceFilter = {};
    if (minPrice || maxPrice) {
      priceFilter['rooms.pricePerNight'] = {};
      if (minPrice) priceFilter['rooms.pricePerNight'].$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter['rooms.pricePerNight'].$lte = parseFloat(maxPrice);
    }

    // Use aggregation for better filtering
    const aggregationPipeline = [
      { $match: filter },
      { $unwind: '$rooms' },
      ...(Object.keys(priceFilter).length > 0 ? [{ $match: priceFilter }] : []),
      { $group: {
          _id: '$_id',
          doc: { $first: '$$ROOT' },
          matchingRooms: { $push: '$rooms' }
        }
      },
      { $addFields: {
          'doc.rooms': '$matchingRooms'
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: '$owner' },
      { $addFields: {
          'ownerId': {
            _id: '$owner._id',
            name: '$owner.name',
            email: '$owner.email'
          }
        }
      },
      { $project: { owner: 0 } }
    ];

    const properties = await Property.aggregate(aggregationPipeline);
    
    // Get total count for pagination
    const countFilter = { ...filter };
    if (Object.keys(priceFilter).length > 0) {
      countFilter['rooms.pricePerNight'] = priceFilter['rooms.pricePerNight'];
    }
    const total = await Property.countDocuments(countFilter);

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

// GET single property by ID
const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerId', 'name email');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    if (!property.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Property is not active'
      });
    }
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// POST create new property
const createProperty = async (req, res, next) => {
  try {
    const property = new Property(req.body);
    const savedProperty = await property.save();
    
    await savedProperty.populate('ownerId', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: savedProperty
    });
  } catch (error) {
    next(error);
  }
};

// PUT update property
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).populate('ownerId', 'name email');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// DELETE property (soft delete)
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
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