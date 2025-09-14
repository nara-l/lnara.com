---
title: "Nature of Objects In OOP"
description: "WARNING! READING THIS POST MAY LEAVE YOU MORE CONFUSED.THE WRITER DOES NOT CLAIM TO HAVE MASTERED THE SUBJECT NOR ADDRESSES THE WHOLE SUBJECT IN QUESTION...."
pubDatetime: 2010-11-11T21:51:00.000Z
author: "Lawrence Nara"
tags: ["Algorithm","objects","PHP"]
draft: false
modDatetime: 2019-03-25T22:42:06.000Z
timezone: "UTC"
---

**WARNING!** **READING THIS POST MAY LEAVE YOU MORE CONFUSED.THE WRITER DOES NOT CLAIM TO HAVE MASTERED THE SUBJECT NOR ADDRESSES THE WHOLE SUBJECT IN QUESTION.HE TRIES TO SHARE WHAT HE UNDERSTANDS IN THE ‘CONFUSED’ NATURE OF OBJECTS IN OBJECT ORIENTED PROGRAMMING** – with case php.We shall stick with Php5>. I was Introduced to an Object Oriented mindset when I started using Kohana-php as a tool in my development. It turns out that, you may use the tools and the methods, but the thought process is a completely different aspect which few will come to appreciate. My former boss once asked me; Nara what is an Object?. I could hardly give a clear answer. This answer becomes a victim of  “I know what the thing is but I can’t explain what it is!”. My adventures have led me to take up the thought activity of OOP. **The Aim of this post:** 1. It is intended to familiarize the reader about what OOP is really about, and possibly have him/her taking advantage of it, while keeping it fun. 2. It is intended to be direct. It is intended to make the idea of OOP unobstructed as much as I can go. 3. This article is supposed to be short and introduce the reader to the concept. **Assumption:** The article assumes you have a basic knowledge of php. Let’s Go!... **What is Object Oriented Programming?**  We say it is a type of programming in which programmers define not only the data type of a data structure, but also the types of **operations** that can be applied to the data structure. In this way, the data structure becomes an object that includes both data and functions. In addition, programmers can create relationships between one object and another. For example, objects can inherit characteristics from other objects. It is by far not only a matter of syntax; it is a way of thinking, a way of practicing and a way of applying. **Lets Recognize Objects.** It is essential we use real life analogies to bring familiarity to OOP. Let’s use a car. **What a car has (Properties):** Windows, Doors, An Engine, Wheels. These objects can further have their own properties and behaviour. This is called Composition in OOP terminology. Just focus on the large object in development, the car. Try to implement only what you need. **What a car can do (Behaviour)** Accelerate,Brake,Open doors **Lets Define an object.** We should say an object is an entity that encapsulates properties and behaviour that is specific to that entity. Programming, an object should be seen as an Implementation of a class,the class is a blue print;because there is a class, we can talk of an object. **Lets try to sort Something :** I see it like: classes are made so that they can become objects at use time. So saying and object extends another object means a class extends a class. If we talk of an object then there is a class around. This part always gets me lost :). **Lets Relate around us.**

-   The magazine you are holding is an object.
-   The articles in it are objects.
-   The window in your room is an object.
-   Your room is an object.
-   Everything you can see is an object.

But there is a lot more to OOP as a concept. **Things to keep in mind.** Functions in a class are called Methods. Variables in a Class are called Properties. So far So fine :). **Things to keep in mind (Nature of Objects).** There are three pillars of OOP. **Encapsulation, Inheritance, Polymorphism.** Lets take one at a time we stick with PHP. **Encapsulation:** The object should keep its details to itself, and only expose its interface (or: behaviour) to the outside. **KEYWORDS:** **Private, Public, Protected** Private, Protected & Public, called specifiers. They are mainly here for data security. The use of them in programming is a separate, process on its own and has generated several arguments. Lets demonstrate:

```php
<?php
class Member 
{
       public $name;//the name of a member is declared public
       private $age;//the age is declared public
       protected $activities; //the activities of the member is declared protected


 //we declare a constructor which is loaded when the class is Instantiated
public function  \_\_construct($name,$age,$activities)
{
$this->name = $name;
$this->age = $age;
$this->activities = $activities;
}

//Lets us this accessor to access the activities from when out of this class.
//it has been declared protected
public   function getAct($activities){
//this works as $activity is protected in Member
>return $this->activities ;
}

}
//Use:
$name= 'Sunil';
$age = '28';
$activities = 'Has not been paying their dues.';
//Create a new instance of the member class
$mem = new Member($name,$age,$activities);
//Prints this since this is public
echo " Name : " . $mem->name;
//Prints this since we use an accessor
echo " Activities :" .$mem->getAct($activities);
//Fatal error: Cannot access protected property Member::$activities
//comment it out
echo "Activities : " .$mem->activities;
//this is not possible.We can't access this directly, it’s protected//Fatal error: Cannot access private property Member::$age

echo "Age  : " .$mem->age;//this is private.
```

**Lets Explain:** A **public** access specifier allows the data members and methods to be access from anywhere in the script. A method or data member declared as **privat**e can only be accessed by the class itself and neither the outside program nor the derived class can have access to it. A **protected** access specifier allows the derived class to access the data member or member functions of the base class, but does not allow global access to other objects and functions. We see this as we use the **getAct()** function to access the activities which was declared protected.Notice that we could not access $activities property directly. **Inheritance:** This is mainly inheriting the properties of a Superclass or Parent class to another class which is called the child class. As a child inherits the properties from a parent. This property is of great significance, because we don't have to declare the same properties in different classes again and again. We just declare the significant properties to a class and go on inheriting these classes to other classes, which needs to implement or reflect such properties in addition to its own properties. This approach naturally saves a lot of complexity. **KEYWORD:** **Extends** (a child extends properties of parent).A class can extend several classes. Lets Demonstrate: A car is a parent and a Sports car is a derivative of a Car. That is a sports car Inherits all the properties of a Car.

<?php   
class Car {         
      public $description;     
      public $cost;         

    public   function \_\_construct($d, $c) {
            $this->set($d, $c);
            }

    public        function set($d,$c) {
                $this->description = $d;
                $this->cost = $c;
            }

    public     function display() {
            echo "Description : ".$this->description.'<br/>Cost : '. number\_format($this->cost) ."FCFA";
            }



    public    function setDescription($d) {
                $this->description = $d;
            }

    public     function getDescription() {
                return $this->description;
            }
        }

class Sportcar extends Car {
                      public $tyres;

    public      function \_\_construct($d, $c, $t)
                    {
//we use the parent method set.Sport car inherits
                                 $this->set($d, $c);
                                 $this->tyres = $t;
                    }


//This is a function to display the number of tyres
    public    function displays()
                   {
         echo "I am a Sport Car.";
          $this->display();  //this is the inherited method from the parent
     // Here is to display the number of tyres
                           echo "<br/> Number of Tyres : $this->tyres";
                   
                   }
}

//Use:

$description = "Toyota";
$cost = 2000000;
//Instantiate the parent class,create a new object $ordinary
$ordinary = new Car($description, $cost);
$description = "Porsche";
$cost = 5000000;
$tyres = 4;

// Instantiate the sportscar class,create a new object $spcar

            $spcar = new Sportcar($description,$cost,$tyres);

//Lets use all the instantiated material
                        $ordinary->display(); //use the parent
            $spcar->displays(); //use the sports car
/\*
 \*Output
Description : Toyota
Cost : 2,000,000FCFA
I am a Sport Car.

Description : Porsche
Cost : 5,000,000FCFA
Number of Tyres : 4
\*/

?>

**Lets Explain:** We go further to create a new method displays() which is peculiar to the sports car only. A Sport car is a Car it inherits all its variables and functions from Car.We see this as the display() method which we created in the Parent Class (Car), we use it(inherit ), in the displays() method of the sports car. The variable $ordinary is an Object. The variable $spcar is an Object **Polymorphism:** This concept simply means one face and multiple interfaces. This concept of Polymorphism is achieved through functions having the same name, but their execution depending on the context. PHP has no concept of strong typing so a lot of this is automatic, since it has no concept of strong typing, thus all objects will be treated equally, anyway. **We shall dedicate a different post to this pillar (Lets stick to our objective KIS-Short).**  These basic concepts have encouraged the evolution of a rich programming style. **Things to keep in mind (Nature of objects):** Three advantages of OOP **Reusability:** Objects can stand on their own. They are abstracted; they represent one thing. This means that they can be combined in many ways, which makes for (and encourages) reusability. Reusing objects rather than having to reinvent the wheel over and over again can save a lot of time. **Extendibility:** Instead of writing a completely new object every time you need one (which often takes quite some time), you can often extend one. It is in the nature of objects that they are extendable. One can derive an object from another object, and thus extend its functionality without having to rewrite the whole object and add the required functionality. **Maintainability:** Because of the very natural way, objects (and their hierarchies) can be designed, they are easy to read, which makes it easier to analyse, and thus extend already existing applications. Because of the "pluggable" nature of objects, less code modification is needed to integrate new features into an application. **Conclusion** Object Oriented Programming is a powerful and often elegant approach to analyze, design, and implement a solution to a problem, but not something you master in days, weeks, or even years. It is certainly not the golden key to solve every problem, that will be too bad to be true :). It will not be realistic to apply OOP to that small script which is to take charge of emailing a form.But it should come handy in the design of average to large scale applications. **Othello: A minute to learn, A lifetime to master.** **Resources:** [http://php.net/manual/en/language.oop5.php](http://php.net/manual/en/language.oop5.php) **My other Posts Here:** [njielitumbe.livejournal.com](http://njielitumbe.livejournal.com/)