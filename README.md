# Breviloquia Italica: `frustum` visualization tool

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.11241357.svg)](https://doi.org/10.5281/zenodo.11241357)
![GitHub License](https://img.shields.io/github/license/breviloquia-italica/frustum)


This resource contains the full sourcecode for the `frustum` visualization tool of the [Breviloquia Italica](https://github.com/breviloquia-italica) project.

## Usage

The tool can be used online at https://breviloquia-italica.github.io/frustum/.

To start, click `Choose file` to upload your CSV datafile; it should contain the following colums:
* `timestamp` (ISO8601 string)
* `user_id` (anonymized UUID)
* `tweet_id` (number)
* `latitude` (number)
* `longitude` (number)
* `word` (string)

Here is an example:

```csv
timestamp,user_id,tweet_id,latitude,longitude,word
2022-01-01T00:14:27+00:00,9a7fa8ac-fe6c-5459-afdf-8e3f08a069fd,1477070681808552000,44.185027,8.27048,twitteri
2022-01-01T00:57:08+00:00,8ef75676-bddb-50a5-ac27-e2977beb1026,1477081422053744600,45.920607,12.941076,gintonic
2022-01-01T01:32:46+00:00,cad4ecc7-e52d-5c32-a24e-88c93e4e5ad9,1477090390989852700,50.855017,4.375468,#novax
2022-01-01T01:42:02+00:00,63abfe7f-3573-5ed8-8f2b-56e52fbe1b8c,1477092719516397600,42.436982,14.140986,#sapevatelo
```

Once the data is loaded, you are presented with three views:
* a list of words (you can filter a subset of words by dragging a selection or CTRL-clicking),
* an hexbin plot over a map (you can filter an area by dragging to draw a rectangle),
* an histogram plot over a timeline where bins are days (you can filter a period by dragging to draw a range).
The filter of each view affects the other two views.

You can pick which aggregate statistic to view by using the dropdown menu and choosing between the following:
* `Aggregate counting occurrences`: the number of rows in the data containing a word.
* `Aggregate counting unique tweets`: the number of unique tweets containing a word (the `tweet_id` column is the index).
* `Aggregate counting unique users`: the number of unique users of a word (the `user_id` column is the index).
The numbers in the views will be the total (in the word list), the count per hex (in the map), and the count per day (in the histogram).

## Desiderata

This is a list of features left to future work.

- General:
  - cute logo
  - choice between log/linear intensity
  - choice between rel/abs intensity (wrt orthogonal filters)
  - temporal animation with play/stop button
  - filter reset button
- Map:
  - zoom/pan
  - add contours of european nations
  - add contours of provinces
  - redraw on resize
  - show number on hover
- Timeline:
  - zoom/pan
  - redraw on resize
  - show number on hover
