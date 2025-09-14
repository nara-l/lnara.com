---
title: "Bubble Sort Algorithm with PHP"
description: "Today I happened to have stumbled on \"how algorithms shape our world(http://www.ted.com/talks/kevinslavinhowalgorithmsshapeourworld.html)\" by Kevin Slav..."
pubDatetime: 2012-12-14T21:46:09.000Z
author: "Lawrence Nara"
tags: ["Algorithm","PHP"]
draft: false
modDatetime: 2019-03-25T20:52:33.000Z
timezone: "UTC"
---

Today I happened to have stumbled on "[how algorithms shape our world](http://www.ted.com/talks/kevin_slavin_how_algorithms_shape_our_world.html)" by Kevin Slavin. Kevin draws inspiration from real life scenes,Wall street ,  Amazon, Netflix to show how algorithms shape our world in all forms. I was looking at the [bubble sort algorithm](http://rosettacode.org/wiki/Sorting_algorithms/Bubble_sort) , thought that I've never implemented it in php (I used usort before) and found how elegant  she is in Wikipedia. From the books "The bubble sort is generally considered to be the simplest sorting algorithm. Because of its simplicity and ease of visualization, it is often taught in introductory computer science courses. Because of its abysmal O(n2) performance, it is not used often for large (or even medium-sized) datasets.". We have this:

function bubbleSort( [array](http://www.php.net/array) &$array )
{
 do
 {
  $swapped \= false;
  for( $i \= 0, $c \= [count](http://www.php.net/count)( $array ) \- 1; $i < $c; $i++ )
  {
   if( $array \> $array )
   {
    [list](http://www.php.net/list)( $array, $array ) \=
      [array](http://www.php.net/array)( $array, $array );
    $swapped \= true;
   }
  }
 }
 while( $swapped );
}

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

$array = array(1, 3, 4, 8, 9, 57, 11, 34, 78,90); echo "Array before sorting"; print\_r($array); $array\_count = count($array); for($i=0; $i<=$array\_count; $i++): for($j=0;$j<=$array\_count; $j++): if( @$array < @$array) { $tmp = @$array; $array = $array; $array = $tmp; } endfor; endfor; echo "<br/> After sorting: "; print\_r($array); You could chose to do a better swapping using list, `list($a,$b) = array($b,$a).` `Hope you enjoyed the sort :)`