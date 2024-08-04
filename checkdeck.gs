function fetchDeckData(deckId) {
    const url = `https://api2.moxfield.com/v3/decks/all/${deckId}`;
  try {
    const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    } else {
      Logger.log(`Failed to fetch deck ${deckId}: ${response.getResponseCode()} - ${response.getContentText()}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error fetching deck ${deckId}: ${error}`);
    return null;
  }
}

function calculateBoardTotalPrice(board) {
  let totalPrice = 0;
  const cards = board.cards
  for (const cardId in cards) {
    const card = cards[cardId];
    if (card && card.card && card.card.prices) {
      const prices = card.card.prices
      if (prices.eur && prices.eur_foil) {
        totalPrice += Math.min(prices.eur, prices.eur_foil);
      } else if (prices.eur) {
        totalPrice += prices.eur;
      } else if (prices.eur_foil) {
        totalPrice += prices.eur_foil;
      } else if (prices.ct) {
        totalPrice += prices.ct;
        Logger.log(`Using CardTrader EUR Price for ${card.card.name}`);
      } else {
        Logger.log(`Missing Moxfield EUR price for ${card.card.name}`);
      }
    } else {
        Logger.log(`Missing Moxfield prices for ${card.card.name}`);
    }
  }
  return totalPrice;
}

function calculateDeckTotalPrice(deckData) {
  let totalPrice = 0;
  if (deckData?.boards) {
    totalPrice += calculateBoardTotalPrice(deckData.boards.mainboard);
    totalPrice += calculateBoardTotalPrice(deckData.boards.commanders);
  } else {
    Logger.log("Error calculating moxfield prices");
  }
  return totalPrice;
}

function calculateAverageBoardPriceScryfall(board) {
  let totalPrice = 0;
  const cards = board.cards
  for (const cardId in cards) {
    const card = cards[cardId];
    const scryfallCard = fetchScryfallCardDetails(card.card.scryfall_id);
    if (scryfallCard) {
      totalPrice += calculateWeightedAveragePriceFromReprints(scryfallCard);
    }
  }
  return totalPrice;
}

function calculateAverageDeckPriceScryfall(deckData) {
  let totalPrice = 0;
  if (deckData?.boards) {
    totalPrice += calculateAverageBoardPriceScryfall(deckData.boards.mainboard);
    totalPrice += calculateAverageBoardPriceScryfall(deckData.boards.commanders);
  } else {
    Logger.log("Error calculating scryfall prices");
  }
  return totalPrice;
}

function fetchScryfallCardDetails(scryfallId) {
 const url = `https://api.scryfall.com/cards/${scryfallId}`;
  try {
    const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    } else {
      Logger.log(`Failed to load scryfall card ${scryfallId}: ${response.getResponseCode()} - ${response.getContentText()}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error fetching scryfall card ${scryfallId}: ${error}`);
    return null;
  }
}

function calculateWeightedAveragePriceFromReprints(scryfallCard) {
  const url = scryfallCard.prints_search_uri;
  const response = UrlFetchApp.fetch(url);
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    const prices = data.data.map(card => card.prices.eur).filter(price => price !== null).map(price => parseFloat(price));
    if (prices.length > 0) {
      const median = getMedian(prices);
      const weights = prices.map(price => 1 / (Math.abs(price - median) + 1e-6));
      const weightedSum = prices.reduce((sum, price, index) => sum + price * weights[index], 0);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      return weightedSum / totalWeight;
    }
  }
  Logger.log(`Failed to load scryfall reprints for ${scryfallCard.name}: ${response.getResponseCode()}`);
  return null;
}

function getMedian(values) {
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function extractDeckIdFromUrl(url) {
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1];
}

function main() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const decks = [
    ["sascha", "https://www.moxfield.com/decks/DE1qgL7iqk6Pskp9GX1d-w"],
    ["hacked", "https://www.moxfield.com/decks/0cwGOKcgv0itV-FcqILq5w"],
    ["Sascha", "https://www.moxfield.com/decks/cFF5cWqpVU-YDr2NHp9lFA"],
    ["Baumi", "https://www.moxfield.com/decks/SqTg04vVL0C9hH6AEXe8BA"],
    ["Basti", "https://www.moxfield.com/decks/eTWiMeWEaEOMedYzyMZboQ"],
    ["Lindi", "https://www.moxfield.com/decks/utqYw1dw8ESzzAQerUpRuw"],
    ["Jeremy", "https://www.moxfield.com/decks/8lSPbc8suUWvf6OKoqMmhw"],
    ["Ben", "https://www.moxfield.com/decks/9lCNqVWy4UajKIxAAxt4UA"],
    ["Christian", "https://www.moxfield.com/decks/10cNtbGv4Uy8LL6fV1iq9g"],
    ["Elias", "https://www.moxfield.com/decks/gqKviwTdaUmwmxwnyEnoNQ"],
    ["Alexandros", "https://www.moxfield.com/decks/d1vZwEEQRECE8iKjnQZq9A"],
    ["Max F.", "https://www.moxfield.com/decks/xzXGUJwnKUGq7q78yEuxAQ"],
    ["Enriko", "https://www.moxfield.com/decks/cY9YhUmv6EKm2NtX7vYK_A"],
    ["Kevin", "https://www.moxfield.com/decks/tj-vap2Tb06dqGZEFBzUNw"],
    ["David", "https://www.moxfield.com/decks/B2D7_q5c8kyh7rAoqtYZ-Q"],
    ["Christian B.", "https://www.moxfield.com/decks/bs0mH0EjmUyEdDyy2kpMDA"],
    ["Felix", "https://www.moxfield.com/decks/r2sM2LwWT0Kbn0TdNcVc3Q"],
    ["Philipp", "https://www.moxfield.com/decks/ceqg57DUTEaaNy54QZw-3A"]
  ];

  sheet.clear();
  sheet.appendRow(['Username', 'Deck ID', 'Moxfield Price (EUR)', 'Avg Reprints Scryfall Price (EUR)']);

  decks.forEach(deck => {
    const username = deck[0];
    const deckId = extractDeckIdFromUrl(deck[1]);
    const deckData = fetchDeckData(deckId);

    Logger.log(`Calculating deck for ${username}`);

    if (deckData) {
      const deckPrice = calculateDeckTotalPrice(deckData);
      const avgScryfallPrice = calculateAverageDeckPriceScryfall(deckData).toFixed(2);
      sheet.appendRow([username, deckId, deckPrice.toFixed(2), avgScryfallPrice]);
    }
  });
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Moxfield').addItem('Run Script', 'main').addToUi();
}
