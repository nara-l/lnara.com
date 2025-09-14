---
title: "This is not Complicated :: I am an Interviewer."
description: "After some months of the post I am an Interviewer(http://njielitumbe.livejournal.com/1345.html), this is the follow up article."
pubDatetime: 2010-12-03T21:47:58.000Z
author: "Lawrence Nara"
tags: ["Algorithm","PHP","simple"]
draft: false
modDatetime: 2019-03-25T22:42:47.000Z
timezone: "UTC"
---

After some months of the post [I am an Interviewer](http://njielitumbe.livejournal.com/1345.html), this is the follow up article.

Problem reminder:

We were ask to write an algorithm to to get two random between 1 and 1000000  so that the difference between them is always 355.

You can use what you like but if you write some php then use mt\_rand() inbuilt function to generate.

The posts had pre-assumed that, you know basic php, set up you server and  your 'hello world'  at least has been tested:)

No stress :).

**Reasoning:** If I have one number, then I have the second number by simple arithmethic.

**Analysis:**

Let,

 $z=355;// it is the answer of our problem and it was given to us.

 

Lets have the two numbers, call them $x and $y.

Now lets generate,

$x = mt\_rand(1, 1000000); //Generate $x
$y = $x + $z;//  we got $y. We are done :) 

 

**Where are we?**

First, In 3 lines we got the answer to the interview question!  Hurray!

Secondly,we simply got the second number by adding 355 to the first random number :), arithmetic.

Finally, we use php and we use mt\_rand();

Congrats, we may process to phase two of the interview, that is not my job anymore :),but you are assured for your supposed Google Job :)!.

[![](http://www.job-interview-techniques.com/Graphics/June08_JobInterview_Cover.jpg)](http://www.job-interview-techniques.com/Graphics/June08_JobInterview_Cover.jpg)

**Claims:** The Second Number is not random?!

I push that it is random because we don't know the first and , the second depends on the first.It is random because I can't predict it before the Algorithm starts executing .The Algorithm determines what the second number is :).

So, always,

$y-$x = 355;

This simple thinking has helped me in implementing several random effects I had been working on with apps and products I have been building for the past months.I have actually found it's mutations really handy in several locations. Think starting from the simplest you can think of, build, then go to which ever complicated level you want. Remember "***Everything should be made as simple as possible, not simpler***"-Albert Einstein.

[Wasamundi](http://www.wasamundi.com/),  which will be  a venue makes use of such simple algorithms in it's mutatory forms.

By the way, we are still on private beta testing and soon going to beta test.We have spend some excellent time developing, business modeling and future proofing the core.

I'll see you soon :).

End of Blog post.

For Really Enthusiasts, like Some of my friends :)

After some fierce argument with some friends before this publishing, claiming the second number is not actually random.

I actually spend some few minutes to leave the machine do some work.They where happy with something as this but I was not :).

```php
<?php

/\*\*
 \* Description : Function to generate two random numbers so that the difference is always 355.
 \*
 \* @author Njie Litumbe .L. Nara <njielitumbe@gmail.com><njielitumbe.blogspot.com>
 \* @Under Nason Systems, Inc. <www.nasaonsystems.com>
 \*
 \* All rights Open.
 \*/

class TwoRand{


 var $a ;
 var $b ;

function tworand(){
$this->a =1;//just the variables, making it clean
$this->b = 1000000;

$x=mt\_rand($this->a,$this->b);//Generate $x
$y= mt\_rand($this->a,$this->b);//Generate $y (Please don't use arithmetic)

//Logic

//proceed, it can be $y-$x, we just want to make sure it is positive before they do any thing
    if(($x -$y >0))
    {
    
    //lets go recursive

   while(($x - $y)!== 355)
   {  
          $this->tworand();
          exit;
      }
          echo "Helloo, We got it! ";
          $diff= $x-$y;
          echo 'X = '.$x.' Y= '.$y;  
          echo "Z(Difference)". $diff;    
          return 0;
    
    
   }
   else
   {
         $this->tworand();
   }

}

}//end of class tworand

$tworand = new TwoRand();
```

Our 3 lines of code has ended up as  30 lines including undetermined recursive-ness. **Character of the Above code;**

-   **Inefficient:**

After some undetermined number of refresh before you can actually get the results spitting to the browser, for the other times you get:

Fatal error: Allowed memory size of 134217728 bytes exhausted

Fatal error: Allowed memory size of 134217728 bytes exhausted

 

-   **Not an Algorithm**

Undetermined growth rate. Hardly satisfy any of the conditions for an algorithm

-   **Just thought up on impulse** to satisfy my Arithmetic hater friends :) they know themselves :).

I may not find time to figure out the actual algorithm to to satisfy my Arithmetic hater friends :). It is open for they or anyone to suggest something different.