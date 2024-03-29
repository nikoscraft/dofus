// noinspection ES6MissingAwait

import Gear from "../models/Gear/Gear.js";
import Resource from "../models/Resource.js";
import axios from "axios";
import GearPrice from "../models/GearPrice.js";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export async function get(request, response) {
  const {
    search,
    limit,
    types,
    shouldFetchOnlyBrisage,
    minLevel,
    maxLevel,
    minCurrentPrice = 0,
    isInShopHidden,
    isInInventory,
    shouldHideToBeCrafted,
    shouldShowToBeCraftedOnly,
    shouldDisplayWishlist,
    shouldDisplayOldPrices,
    shouldDisplayToSellItemsOnly,
  } = request.query;
  const formattedSearch = new RegExp(
    decodeURIComponent(search)
      .replace(/,*$/, "")
      .replaceAll(", ", ",")
      .replaceAll(",", "|")
      .toLowerCase()
      .trimStart(),
    "i"
  );
  const query = Gear.find({
    currentPrice: {
      $gte: parseInt(minCurrentPrice) || 0,
    },
    recipe: {
      $exists: true,
      $ne: [],
    },
    level: {
      $gte: parseInt(minLevel) || 1,
      $lte: parseInt(maxLevel) || 200,
    },

    name: formattedSearch,
  });

  if (shouldDisplayToSellItemsOnly === "true") {
    query.findToSellItems();
  }

  if (shouldDisplayOldPrices === "true") {
    query.findOldPrices();
  }

  if (shouldHideToBeCrafted === "true") {
    query.findItemsToCraft();
  }

  if (isInInventory === "true") {
    query.inInventory();
    query.sort({
      level: "desc",
    });
  }

  if (isInShopHidden === "true") {
    query.withoutShop();
  }

  if (shouldFetchOnlyBrisage === "true") {
    query.onlyBrisage();
  }

  if (types) {
    query.findByTypes(types);
  }

  if (shouldDisplayWishlist === "true") {
    query.findWishList();

    query.sort({
      level: "desc",
    });
  }

  if (shouldShowToBeCraftedOnly === "true") {
    query.findToBeCrafted();

    query.sort({
      level: "desc",
      name: "asc",
    });
  } else if (shouldDisplayOldPrices === "false") {
    query.sort({
      ratio: "desc",
    });
  }

  query.sort({
    isInInventory: -1,
  });

  query.limit(limit);
  const gears = await query.exec();
  const formattedGears = await getFormattedGears(gears, request.query);

  response.json({
    gears: formattedGears,
  });
}

/**
 * If shouldDisplayOldPrices is true, return the gears as is, no need for the recipe
 * Else, return the gears with the recipe
 * @param {*} gears
 * @param {*} shouldDisplayOldPrices
 * @returns
 */
const getFormattedGears = async (gears, requestQuery) => {
  const baseGearsFilters = ["shouldFetchOnlyBrisage"];

  return baseGearsFilters.some((filter) => requestQuery[filter] === "true")
    ? gears
    : await Promise.all(
        gears.map(async (gear) => {
          const recipe = await gear.formattedRecipe();
          return {
            ...gear._doc,
            recipe,
          };
        })
      );
};

/**
 *
 * sold: sold + 1,
 * isInMarket: false,
 * toBeCrafted: toBeCrafted + 1,
 */
export async function sellMany(request, response) {
  const { gearIds } = request.fields;
  const gears = await Gear.find({
    _id: {
      $in: gearIds,
    },
  });

  await Promise.all(
    gears.map(async (gear) => {
      gear.sold = gear.sold + 1;
      gear.isInMarket = false;
      gear.toBeCrafted = gear.toBeCrafted + 1;
      await gear.save();
    })
  );

  response.json({
    message: "ok",
  });
}

/**
 * Take all the gears
 * For Each
 * Update the crafting price according to the recipe
 * @param request
 * @param response
 * @return {Promise<void>}
 */
export async function updateCraftingPrices(request, response) {
  const gears = await Gear.find({
    recipe: {
      $exists: true,
      $ne: [],
    },
  });

  await Promise.all(
    gears.map(async (gear) => {
      const craftingPrice = await gear.calculateCraftingPrice();
      await gear.setCraftingPrice(craftingPrice);
    })
  );

  response.json({
    messaage: "ok",
  });
}

/**
 * DANGER ZONE
 * @param request
 * @param response
 * @returns {Promise<void>}
 */
export async function fill(request, response) {
  const createdItems = [];
  const { data: gears } = await axios
    .get("https://fr.dofus.dofapi.fr/equipments")
    .then((response) => response);
  await Promise.all(
    gears.map(async (gear) => {
      const { name, level, imgUrl, type, description, _id, recipe } = gear;
      const createdItem = await Gear.create({
        name,
        level,
        imgUrl,
        type,
        description,
        recipe: recipe.map((object) =>
          Object.entries(object).map(([name, values]) => {
            return { name, quantity: values.quantity };
          })
        ),
      });

      createdItems.push(createdItem.name);
    })
  );

  response.json({
    createdItems,
  });
}

export async function update(request, response) {
  const { _id } = request.params;
  if (_id) {
    const {
      currentPrice,
      sold,
      isInInventory,
      toBeCrafted,
      recipe,
      isInMarket,
      onWishList,
      brisage,
      name,
    } = request.fields.product;

    const parsedCurrentPrice = parseInt(currentPrice);
    const gear = await Gear.findById(_id);
    const ratio = currentPrice / gear.craftingPrice;

    if (brisage && gear.brisage?.ratio !== brisage?.ratio) {
      gear.updateBrisage(brisage.ratio);
    }

    const hasBeenPutInMarket = gear.isInMarket === false && isInMarket === true;
    let inMarketSince = gear.inMarketSince;
    if (hasBeenPutInMarket) {
      inMarketSince = new Date();
    }

    const updatedGear = await Gear.findByIdAndUpdate(_id, {
      currentPrice: parsedCurrentPrice || 0,
      sold,
      isWanted: false,
      isInInventory,
      toBeCrafted,
      onWishList,
      recipe,
      isInMarket,
      ratio,
      inMarketSince,
    }).catch((e) => {
      console.log("error", e);
      response.json({ e });
    });

    await updatedGear.onRecipePriceChange();

    if (parseInt(currentPrice) !== gear.currentPrice) {
      await gear.updatePricesHistory();
      await gear.updateLastPriceDate();
    }

    response.json({
      gear: updatedGear,
    });
  } else {
    response.json({
      message: "Pas de changement, ID n'est pas défini",
    });
  }
}

/**
 * Update some gears according to their gearIds and parameters filters
 * @param request
 * @param response
 * @returns {Promise<void>}
 */
export async function updateMany(request, response) {
  const { gearIds, parameters } = request.fields;
  const updatedGears = await Gear.updateMany(
    {
      _id: {
        $in: gearIds,
      },
    },
    parameters
  );
  response.json({
    gearIds,
    parameters,
    updatedGears,
  });
}

export async function getPricesHistory(request, response) {
  response.json({
    prices: await GearPrice.find({ GearId: request.params._id }),
  });
}

export async function failAtSelling(request, response) {
  const gear = await Gear.findById(request.params._id);
  const { currentPrice } = gear;
  const gearPrice = await GearPrice.findOneAndUpdate(
    {
      GearId: request.params._id,
      price: currentPrice,
    },
    {
      $inc: {
        numberOfFailures: true,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (gearPrice) {
    gearPrice.updateRatio();
    response.json({
      message: "ok",
      gearPrice,
    });
  } else {
    const gearPrice = await gear.updatePricesHistory();
    gearPrice.numberOfFailures = 1;
    await gearPrice.save();
    gearPrice.updateRatio();

    response.json({
      message: "ok",
      gearPrice,
    });
  }
}

export async function deletePrice(request, response) {
  await GearPrice.findByIdAndDelete(request.params._id);

  response.status(200).json({ message: "ok" });
}

export async function swapComponents(request, response) {
  const sourceName = "Étoffe de Fantôme Pandore";
  const targetName = "Sabot de Gliglicérin";

  const gears = await Gear.find({
    recipe: {
      $elemMatch: {
        name: sourceName,
      },
    },
  });

  await Promise.all(
    gears.map(async (gear) => {
      gear.recipe = gear.recipe.map((element) => {
        const { name } = element;
        return name !== sourceName
          ? element
          : {
              ...element,
              name: targetName,
            };
      });

      await gear.save();
    })
  );

  response.json(gears.map(({ name, recipe }) => ({ name, recipe })));
}

async function downloadImages(start, end) {
  let itemAdded = 0;

  const gears = await Gear.find().sort({ level: 1 });
  const images = gears.map(({ imgUrl }) => imgUrl);
  const newUrlList = images.map((url) => {
    const gearDetails = url.split("items/")[1];
    return `https://static.ankama.com/dofus/www/game/items/${gearDetails}`;
  });
  const slicedUrlList = newUrlList.slice(start, end);
  for (const url of slicedUrlList) {
    const resourceDetails = url.split("items/")[1];
    const destination = `../src/images/gears/${resourceDetails}`;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create the directory if it doesn't exist
    const dir = path.dirname(destination);
    fs.mkdirSync(dir, { recursive: true });

    // File exists -> skip
    if (fs.existsSync(destination)) {
      console.log("File exists", destination);
      continue;
    }

    console.log("Downloading", url, "to", destination);

    try {
      const stdout = execSync(`curl -k -o ${destination} ${url}`);
      console.log(`stdout: ${stdout}`);
    } catch (error) {
      console.error(`exec error: ${error}`);
      continue;
    }

    itemAdded++;

    // Wait for 1 second before the next iteration
  }

  return {
    message: "Challah comme on dit.",
    count: images.length,
    example: images[0],
    gears: gears.slice(0, 1),
    newUrlList: newUrlList.slice(0, 1),
    itemAdded,
    start,
    end,
  };
}

export async function create(request, response) {
  const { name, recipe } = request.fields;
  const resourceMatching = await Resource.findOne({
    name,
  });
  if (!resourceMatching) {
    response.json({
      message: "Resource not found",
    });
    return;
  }

  const { level, imgUrl, type, description } = resourceMatching;
  const createdItem = await Gear.create({
    name,
    level,
    imgUrl,
    type,
    description,
    recipe: recipe.map((component) => {
      const { name, quantity } = component;
      return {
        name,
        quantity,
      };
    }),
  });

  const craftingPrice = await createdItem.calculateCraftingPrice();

  const resource = await Resource.findOne({ name });

  if (resource) {
    resource.currentPrice = craftingPrice;
    await resource.save();
  }

  response.json({
    createdItem,
    resource,
  });
}

export const deleteGear = async (request, response) => {
  const { _id } = request.params;
  const deletedGear = await Gear.findByIdAndDelete(_id);

  response.json({
    deletedGear,
  });
};

/**
 * This method is only supposed to run once, to fill the images folder
 * @param {*} request
 * @param {*} response
 */
export async function fillImages(request, response) {
  const result = await downloadImages(2000, 2500);

  response.json(result);

  return;
}
