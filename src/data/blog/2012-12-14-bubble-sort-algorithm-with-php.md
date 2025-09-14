---
title: "Bubble Sort Algorithm with PHP"
description: "Today I happened to have stumbled on an article about how algorithms shape our world by Kevin Slavin. This got me thinking about bubble sort algorithms in PHP."
pubDatetime: 2012-12-14T21:46:09.000Z
author: "Lawrence Nara"
tags: ["Algorithm","PHP"]
draft: false
modDatetime: 2019-03-25T20:52:33.000Z
timezone: "UTC"
---

Today I happened to have stumbled on "[how algorithms shape our world](http://www.ted.com/talks/kevin_slavin_how_algorithms_shape_our_world.html)" by Kevin Slavin. Kevin draws inspiration from real life scenes,Wall Street ,  Amazon, Netflix to show how algorithms shape our world in all forms. I was looking at the [bubble sort algorithm](http://rosettacode.org/wiki/Sorting_algorithms/Bubble_sort) , thought that I've never implemented it in php (I used usort before) and found how elegant  she is in Wikipedia. From the books "The bubble sort is generally considered to be the simplest sorting algorithm. Because of its simplicity and ease of visualization, it is often taught in introductory computer science courses. Because of its abysmal O(n2) performance, it is not used often for large (or even medium-sized) datasets.". We have this:

```php
function bubbleSort( array &$array )
{
 do
 {
  $swapped = false;
  for( $i = 0, $c = count( $array ) - 1; $i < $c; $i++ )
  {
   if( $array[$i] > $array[$i+1] )
   {
    list( $array[$i], $array[$i+1] ) =
      array( $array[$i+1], $array[$i] );
    $swapped = true;
   }
  }
 }
 while( $swapped );
}
```

"The bubble sort works by passing sequentially over a list,

comparing each value to the one immediately after it.

If the first value is greater than the second,

their positions are switched.

Over a number of passes, at most equal to the number

of elements in the list,all of the values drift into

their correct positions(large values "bubble" rapidly

toward the end, pushing others down around them)."

It's use basically is to sort arrays.

So, I decided to write it in php.

Simply, we shall pass through the array in question

using 2 for loops. For each of the value,

we shall compare the lower value with the upper value and

switch positions only if the lower value is less than

the upper value. Hence we keep pushing bigger values

behind:" they bubble up".

```php
$array = array(1, 3, 4, 8, 9, 57, 11, 34, 78, 90);
echo "Array before sorting";
print_r($array);

$array_count = count($array);
for($i=0; $i<=$array_count; $i++):
    for($j=0; $j<=$array_count; $j++):
        if( @$array[$j] > @$array[$j+1]) {
            $tmp = @$array[$j];
            $array[$j] = $array[$j+1];
            $array[$j+1] = $tmp;
        }
    endfor;
endfor;

echo "<br/> After sorting: ";
print_r($array);
```

You could chose to do a better swapping using list, `list($a,$b) = array($b,$a).`

Hope you enjoyed the sort :)