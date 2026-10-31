# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Métropole de Lyon: its 28 recycling centres with hours (fixed and mobile
  ones) from the open data of Grand Lyon, with summer and winter hours, dated
  closures and the accepted waste. No account needed.
- Accepted waste: bulky waste, plaster, lamps, textiles, paper and windows, as
  Lyon lists them.

## [1.0.0] - 2026-10-30

### Added

- The recycling centres (déchèteries) of four French metropolitan areas, from
  their open data: Strasbourg, Toulouse Métropole (Decoset), Bordeaux Métropole
  and Tours Métropole Val de Loire. Offered by area, or the nearest ones to the
  house (its location in Gladys), within a distance you set.
- One device per site added: open now, today's hours, closing time and next
  opening, computed every minute, public holidays included (as said by the
  source, otherwise an assumption the texts admit).
- In Bordeaux, the accepted waste as a text and five yes/no features: green
  waste, rubble, wood, electrical appliances, bulky waste.
- Scene triggers: a site opens, closes soon (minutes set in the configuration,
  30 by default), closes.
- Scene action "Is the recycling centre open?": the sites in a sentence, with
  the number open.
- Dashboard widget: one row per site, open until when or next opening.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-decheteries/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-decheteries/releases/tag/v1.0.0
