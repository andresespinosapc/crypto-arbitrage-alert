CREATE TABLE `ticker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `coin1` varchar(10) NOT NULL,
  `coin2` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last` float DEFAULT NULL,
  `bid` float DEFAULT NULL,
  `ask` float DEFAULT NULL,
  `daily_volume` float DEFAULT NULL,
  `website` varchar(30) NOT NULL,
  PRIMARY KEY (`id`)
)
