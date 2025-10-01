//Upit 1
db.BoardGamesOptimized.createIndex({ "Design.Category": 1, "Stats.Average": 1 })
db.BoardGamesOptimized.createIndex({ "Stats.Average": 1 })
db.BoardGamesOptimized.createIndex({ "Design.Category": 1 })
db.BoardGamesOptimized.createIndex({ "Design.Category": 1, "Stats.Average": -1 })

db.BoardGamesOptimized.aggregate([
  { $match: { "Design.Category": { $exists: true, $ne: null }, "Stats.Average": { $gt: 0 } } },
  { $addFields: {
      wants_game: { $add: ["$Stats.Wanting", "$Stats.Wishing", "$Stats.Trading"] },
      owned_plus_wants: { $add: ["$Stats.Owned", { $add: ["$Stats.Wanting", "$Stats.Wishing", "$Stats.Trading"] }] },
      avg_players: { $avg: ["$Players.MinPlayers", "$Players.MaxPlayers"] },
      category: "$Design.Category",
      avg_rating: "$Stats.Average",
      avg_weight: "$Stats.AverageWeight"
    }
  },
  { $group: {
      _id: "$category",
      game_count: { $sum: 1 },
      avg_rating: { $avg: "$avg_rating" },
      avg_weight: { $avg: "$avg_weight" },
      total_owned_plus_wants: { $sum: "$owned_plus_wants" },
      avg_players: { $avg: "$avg_players" }
    }
  },
  { $sort: { total_owned_plus_wants: -1, avg_rating: -1 } },
  { $project: {
      _id: 0,
      category: "$_id",
      game_count: 1,
      avg_rating: { $round: ["$avg_rating", 2] },
      avg_weight: { $round: ["$avg_weight", 2] },
      avg_players: { $round: ["$avg_players", 1] },
      total_owned_plus_wants: 1
    }
  },
  { $limit: 10 }
])

//Upit 2
db.BoardGamesOptimized.createIndex({ "Stats.UsersRated": 1, "Stats.Average": 1, "Stats.AverageWeight": 1, "Design.Publisher": 1 })
db.BoardGamesOptimized.createIndex({ "Design.Publisher": 1, "Stats.Average": -1 })

db.BoardGamesOptimized.aggregate([
  { $match: { "Stats.UsersRated": { $gt: 500 }, "Stats.Average": { $gt: 6.5 }, "Stats.AverageWeight": { $gt: 4 }, "Design.Publisher": { $exists: true, $ne: null } } },
  { $addFields: { avg_players: { $avg: [{ $toDouble: "$Players.MinPlayers" }, { $toDouble: "$Players.MaxPlayers" }] } } },
  { $group: {
      _id: "$Design.Publisher",
      total_games: { $sum: 1 },
      total_usersrated: { $sum: "$Stats.UsersRated" },
      avg_weight: { $avg: "$Stats.AverageWeight" },
      avg_players: { $avg: "$avg_players" },
      best_game: { $first: "$$ROOT" }
    }
  },
  { $sort: { total_games: -1 } },
  { $limit: 5 },
  { $project: {
      _id: 0,
      publisher: "$_id",
      total_games: 1,
      total_usersrated: 1,
      avg_weight: { $round: ["$avg_weight", 2] },
      avg_players: { $round: ["$avg_players", 1] },
      best_game_name: "$best_game.Name",
      best_game_type: "$best_game.Type",
      best_game_rating: "$best_game.Stats.Average"
    }
  }
]).explain("executionStats")

//Upit 3
db.BoardGamesOptimized.createIndex({"Stats.Average": -1, "Stats.UsersRated": 1,"Design.Categories": 1,"Players.MaxPlayers": 1});

db.BoardGamesOptimized.aggregate([
  { $match: { "Stats.Average": { $gt: 0 } } },
  { $group: { _id: null, avg_all_games: { $avg: "$Stats.Average" }, all_games: { $push: "$$ROOT" } } },
  { $project: { high_rating: { $filter: { input: "$all_games", as: "g", cond: { $gte: ["$$g.Stats.Average", "$avg_all_games"] } } } } },
  { $unwind: "$high_rating" },
  { $project: {
      publishers_array: { $split: [{ $ifNull: ["$high_rating.Design.Publisher", "Unknown"] }, ","] },
      usersrated: "$high_rating.Stats.UsersRated",
      avgweight: "$high_rating.Stats.AverageWeight"
    }
  },
  { $unwind: "$publishers_array" },
  { $group: {
      _id: { $trim: { input: "$publishers_array" } },
      total_games: { $sum: 1 },
      total_usersrated: { $sum: "$usersrated" },
      avg_weight: { $avg: "$avgweight" }
    }
  },
  { $project: { total_games: 1, total_usersrated: 1, avg_weight: { $round: ["$avg_weight", 2] } } },
  { $sort: { total_games: -1 } },
  { $limit: 3 },
  { $group: {
      _id: "high_rating_summary",
      top_publishers: { $push: "$_id" },
      total_games: { $sum: "$total_games" },
      total_usersrated: { $sum: "$total_usersrated" },
      avg_weight: { $avg: "$avg_weight" }
    }
  },
  { $project: { top_publishers: 1, total_games: 1, total_usersrated: 1, avg_weight: { $round: ["$avg_weight", 2] } } }
]).explain("executionStats");

//Upit 4
db.BoardGamesOptimized.createIndex({"YearPublished": 1, "Design.Categories": 1, "Stats.UsersRated": 1, "Players.MaxPlayers": 1, "Stats.Average": -1});
db.BoardGamesOptimized.createIndex({"Design.Category": 1, "Stats.Average": -1});

db.BoardGamesOptimized.aggregate([
  { $match: { YearPublished: { $gte: 2010 }, "Design.Categories": { $in: ["Strategy", "Card Game"] }, "Stats.UsersRated": { $gte: 50 }, "Players.MaxPlayers": { $lte: 4 } } },
  { $addFields: { players_range: { $concat: [{ $toString: "$Players.MinPlayers" }, "-", { $toString: "$Players.MaxPlayers" }, " igrača"] } } },
  { $sort: { "Stats.Average": -1 } },
  { $project: { Name: 1, Publisher: 1, YearPublished: 1, "Stats.Average": 1, players_range: 1 } }
]);

//Upit 5
db.BoardGames.createIndex({ "Design.Categories": 1, "Players.PlayingTime": 1, "Stats.UsersRated": 1, "Stats.Average": -1 });

db.BoardGames.aggregate([
  { $match: { "Design.Categories": /Strategy/, "Players.PlayingTime": { $lt: 60 }, "Stats.UsersRated": { $gte: 500 }, "Stats.Average": { $gt: 7 } } },
  { $sort: { "Stats.Average": -1 } },
  { $limit: 10 },
  { $project: { Name: 1, "Players.PlayingTime": 1, "Players.MinPlayers": 1, "Players.MaxPlayers": 1 } }
]).explain("executionStats");

