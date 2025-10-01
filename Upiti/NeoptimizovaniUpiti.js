//Upit 1
db.BoardGames.createIndex({ category: 1, average: 1 })
db.BoardGames.createIndex({ average: 1 })
db.BoardGames.createIndex({ category: 1 })
db.BoardGames.createIndex({ category: 1, average: -1 })

db.getCollection("BoardGames").aggregate([
    { $match: { category: { $exists: true, $ne: null }, average: { $gt: 0 } } },
    { $addFields: {
        wants_game: { $add: [{ $getField: "wanting" }, { $getField: "wishing" }, { $getField: "trading" }] },
        owned_plus_wants: { $add: [{ $getField: "owned" }, { $add: [{ $getField: "wanting" }, { $getField: "wishing" }, { $getField: "trading" }] }] },
        avg_players: { $avg: [{ $getField: "minplayers" }, { $getField: "maxplayers" }] },
        category: { $getField: "category" },
        avg_rating: { $getField: "average" },
        avg_weight: { $getField: "averageweight" }
    }},
    { $group: {
        _id: "$category",
        game_count: { $sum: 1 },
        avg_rating: { $avg: "$avg_rating" },
        avg_weight: { $avg: "$avg_weight" },
        total_owned_plus_wants: { $sum: "$owned_plus_wants" },
        avg_players: { $avg: "$avg_players" }
    }},
    { $sort: { total_owned_plus_wants: -1, avg_rating: -1 } },
    { $project: {
        _id: 0,
        category: "$_id",
        game_count: 1,
        avg_rating: { $round: ["$avg_rating", 2] },
        avg_weight: { $round: ["$avg_weight", 2] },
        avg_players: { $round: ["$avg_players", 1] },
        total_owned_plus_wants: 1
    }},
    { $limit: 10 }
]).explain("executionStats")

//Upit 2
db.BoardGamesNotOptimized.aggregate([
  { $match: { usersrated: { $gt: 500 }, average: { $gt: 6.5 }, averageweight: { $gt: 4 }, publisher: { $exists: true, $ne: null } } },
  { $addFields: { avg_players: { $avg: [{ $toDouble: "$minplayers" }, { $toDouble: "$maxplayers" }] } } },
  { $sort: { average: -1 } },
  { $group: { _id: "$publisher", total_games: { $sum: 1 }, total_usersrated: { $sum: "$usersrated" }, avg_weight: { $avg: "$averageweight" }, avg_players: { $avg: "$avg_players" }, best_game: { $first: "$$ROOT" } } },
  { $sort: { total_games: -1 } },
  { $limit: 5 },
  { $project: { _id: 0, publisher: "$_id", total_games: 1, total_usersrated: 1, avg_weight: { $round: ["$avg_weight", 2] }, avg_players: { $round: ["$avg_players", 1] }, best_game_name: "$best_game.name", best_game_type: "$best_game.type", best_game_rating: "$best_game.average" } }
])

//Upit 3
db.BoardGames.aggregate([
  { $match: { average: { $gt: 0 } } },
  { $group: { _id: null, avg_all_games: { $avg: "$average" }, all_games: { $push: "$$ROOT" } } },
  { $project: {
      high_rating: { $filter: { input: "$all_games", as: "g", cond: { $gte: ["$$g.average", "$avg_all_games"] } } },
      low_rating: { $filter: { input: "$all_games", as: "g", cond: { $lt: ["$$g.average", "$avg_all_games"] } } }
  }},
  { $unwind: "$high_rating" },
  { $group: {
      _id: "$high_rating.publisher",
      total_games: { $sum: 1 },
      total_usersrated: { $sum: "$high_rating.usersrated" },
      avg_weight: { $avg: "$high_rating.averageweight" }
  }},
  { $project: { total_games: 1, total_usersrated: 1, avg_weight: { $round: ["$avg_weight", 2] } } },
  { $sort: { total_games: -1 } },
  { $limit: 3 },
  { $group: {
      _id: "high_rating_summary",
      top_publishers: { $push: "$_id" },
      total_games: { $sum: "$total_games" },
      total_usersrated: { $sum: "$total_usersrated" },
      avg_weight: { $avg: "$avg_weight" }
  }},
  { $project: { total_games: 1, total_usersrated: 1, avg_weight: { $round: ["$avg_weight", 2] }, top_publishers: 1 } },
  { $lookup: {
      from: "BoardGames",
      pipeline: [
        { $match: { $expr: { $gte: [{ $size: { $split: [{ $ifNull: ["$mechanic", ""] }, ","] } }, 5] } } },
        { $project: { mechanic_array: { $split: ["$mechanic", ","] }, average: 1 } },
        { $unwind: "$mechanic_array" },
        { $group: { _id: "$mechanic_array", avg_rating: { $avg: "$average" }, total_games: { $sum: 1 } } },
        { $project: { total_games: 1, avg_rating: { $round: ["$avg_rating", 2] } } },
        { $sort: { total_games: -1 } }
      ],
      as: "popular_mechanics"
   }},
  { $addFields: { popular_mechanics: { $map: { input: "$popular_mechanics", as: "m", in: { mechanic: "$$m._id", avg_rating: "$$m.avg_rating", total_games: "$$m.total_games" } } } } } 
])

//Upit 4
db.BoardGames.aggregate([
  { $match: { yearpublished: { $gte: 2010 }, categories: { $in: ["Strategy","Card Game"] }, usersrated: { $gte: 50 }, maxplayers: { $lte: 4 } } },
  { $addFields: { players_range: { $concat: [{ $toString: "$minplayers" }, "-", { $toString: "$maxplayers" }, " igrača"] } } },
  { $sort: { average: -1 } },
  { $project: { name: 1, publisher: 1, yearpublished: 1, average: 1, players_range: 1 } }
])

//Upit 2
db.BoardGames.updateMany({ categories: /Strategy/i }, { $set: { mainCategory: "Strategy" } });

db.BoardGames.aggregate([
  { $match: { mainCategory: "Strategy", playingtime: { $lt: 60 }, usersrated: { $gte: 500 }, average: { $gt: 7 } } },
  { $addFields: { minplayers: { $toInt: "$minplayers" }, maxplayers: { $toInt: "$maxplayers" } } },
  { $sort: { average: -1 } },
  { $limit: 10 },
  { $project: { _id: 0, name: 1, playingtime: 1, minplayers: 1, maxplayers: 1 } }
]).explain("executionStats");

