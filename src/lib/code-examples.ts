const highlights = [
  {
    title: 'Extension Methods',
    description: 'Add methods to any existing type without inheritance or wrappers. Extend structs, primitives, or any user-defined type with clean, discoverable APIs.',
    code: `<span class="type">Point</span> : <span class="keyword">struct</span> &#123;
    x : <span class="type">f32</span>
    y : <span class="type">f32</span>
&#125;

<span class="keyword">@extension</span>
<span class="func">direction</span> : <span class="keyword">func</span>(a : <span class="type">^Point</span>, b : <span class="type">^Point</span>) -&gt; <span class="type">Point</span> &#123;
    <span class="keyword">return</span> <span class="type">Point</span> &#123;
        .x = b.x <span class="operator">-</span> a.x,
        .y = b.y <span class="operator">-</span> a.y
    &#125;
&#125;

p0 : <span class="type">Point</span> &#123; .x = <span class="number">0.0</span>, .y = <span class="number">0.0</span> &#125;
p1 : <span class="type">Point</span> &#123; .x = <span class="number">10.0</span>, .y = <span class="number">10.0</span> &#125;

<span class="comment">// with extension</span>
dir0 := p0.<span class="func">direction</span>(<span class="operator">&amp;</span>p1)

<span class="comment">//without extension. still works</span>
dir1 := <span class="func">direction</span>(<span class="operator">&amp;</span>p0, <span class="operator">&amp;</span>p1)`,
  },
  {
    title: 'Array Types',
    description: 'Fixed arrays put their dimensions before the element type. Use ? when the initializer should determine the compile-time length, or use a typed composite literal anywhere an array expression is needed.',
    code: `<span class="comment">// Fixed array with explicit length</span>
numbers : <span class="type">[3]i32</span> = &#123;<span class="number">10</span>, <span class="number">20</span>, <span class="number">30</span>&#125;

<span class="comment">// Length inferred from the initializer</span>
bytes : <span class="type">[?]u8</span> = &#123;<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>&#125;

<span class="comment">// Canonical array composite literal</span>
more := <span class="type">[?]u8</span>&#123;<span class="number">4</span>, <span class="number">5</span>, <span class="number">6</span>&#125;

matrix : <span class="type">[2][3]i32</span> = &#123;
    &#123;<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>&#125;,
    &#123;<span class="number">4</span>, <span class="number">5</span>, <span class="number">6</span>&#125;
&#125;`,
  },
  {
    title: 'Slice Types',
    description: 'Lightweight views into contiguous memory. Fat pointers carry both a pointer and length, enabling safe iteration over arrays without runtime overhead.',
    code: `arr : <span class="type">[5]i32</span> = &#123;<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>, <span class="number">4</span>, <span class="number">5</span>&#125;
s : <span class="type">[]i32</span> = arr[:]          <span class="comment">// Full array slice</span>
head : <span class="type">[]i32</span> = arr[:<span class="number">3</span>]     <span class="comment">// First 3 elements</span>
tail : <span class="type">[]i32</span> = arr[<span class="number">2</span>:]     <span class="comment">// From index 2</span>
mid : <span class="type">[]i32</span> = arr[<span class="number">1</span>:<span class="number">4</span>]       <span class="comment">// Indices 1..3</span>

<span class="comment">// Iterate with for-in</span>
<span class="keyword">for</span> x <span class="keyword">in</span> s &#123;
    <span class="func">println</span>(<span class="string">"%d"</span>, x)
&#125;`,
  },
  {
    title: 'Generic Functions & Structs',
    description: 'Use type parameters to write reusable functions and structs. Here, max and Pair work with both integers and floating-point values.',
    code: `<span class="comment">// A generic function</span>
<span class="func">max</span> : <span class="keyword">func</span><span class="operator">&lt;</span><span class="type">T</span><span class="operator">&gt;</span>(a : <span class="type">T</span>, b : <span class="type">T</span>) <span class="operator">-&gt;</span> <span class="type">T</span> {
    <span class="keyword">if</span> (a <span class="operator">&gt;</span> b) {
        <span class="keyword">return</span> a
    }
    <span class="keyword">return</span> b
}

<span class="comment">// A generic struct</span>
<span class="type">Pair</span> : <span class="keyword">struct</span><span class="operator">&lt;</span><span class="type">T</span><span class="operator">&gt;</span> {
    first : <span class="type">T</span>
    second : <span class="type">T</span>
}

<span class="func">main</span> : <span class="keyword">func</span>() <span class="operator">-&gt;</span> <span class="type">i32</span> {
    integers : <span class="type">Pair</span><span class="operator">&lt;</span><span class="type">i32</span><span class="operator">&gt;</span> = { .first = <span class="number">10</span>, .second = <span class="number">20</span> }
    decimals : <span class="type">Pair</span><span class="operator">&lt;</span><span class="type">f64</span><span class="operator">&gt;</span> = { .first = <span class="number">1.5</span>, .second = <span class="number">2.5</span> }

    <span class="comment">// The same function works with both types</span>
    biggest := <span class="func">max</span>(integers.first, integers.second) <span class="comment">// 20</span>
    decimal := <span class="func">max</span>(decimals.first, decimals.second) <span class="comment">// 2.5</span>
    <span class="keyword">return</span> <span class="number">0</span>
}`,
  },
  {
    title: 'Pattern Matching',
    description: 'Use switch statements to choose actions and match expressions to produce values, with range patterns and enum matching.',
    code: `<span class="type">Color</span> : <span class="keyword">enum</span> &#123;
    Red,
    Green,
    Blue
&#125;

color := <span class="type">Color</span>.Red
<span class="keyword">switch</span> (color) &#123;
    <span class="keyword">case</span> <span class="type">Color</span>.Red: <span class="func">println</span>(<span class="string">"Red"</span>)
    <span class="keyword">case</span> <span class="type">Color</span>.Green: <span class="func">println</span>(<span class="string">"Green"</span>)
    <span class="keyword">default</span>: <span class="func">println</span>(<span class="string">"Other"</span>)
&#125;

<span class="comment">// Range matching (inclusive upper bounds)</span>
score := <span class="number">85</span>
grade : <span class="type">string</span> = <span class="keyword">match</span> (score) &#123;
    <span class="number">0</span>..=<span class="number">59</span>   <span class="operator">=&gt;</span> <span class="string">"F"</span>,
    <span class="number">60</span>..=<span class="number">79</span>  <span class="operator">=&gt;</span> <span class="string">"C"</span>,
    <span class="number">80</span>..=<span class="number">100</span> <span class="operator">=&gt;</span> <span class="string">"A"</span>,
    <span class="keyword">else</span>      <span class="operator">=&gt;</span> <span class="string">"Invalid score"</span>,
&#125; <span class="comment">// grade is "A"</span>`,
  },
];

const topics = [
  { id: 'extensions', label: 'Extensions', icon: 'M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M9 12h6m-3-3v6' },
  { id: 'arrays', label: 'Arrays', icon: 'M3 5h18v14H3zM9 5v14m6-14v14M3 12h18' },
  { id: 'slices', label: 'Slices', icon: 'M3 5h18v14H3zM8 5v14m8-14v14M8 12h8' },
  { id: 'generics', label: 'Generic', icon: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18' },
  { id: 'matching', label: 'Matching', icon: 'M5 3v12a4 4 0 0 0 4 4h10M5 7h14m-4-4 4 4-4 4m0 4 4 4-4 4' },
];

export const codeExamples = [
  {
    id: 'basics',
    label: 'Basics',
    title: 'Structs & Functions',
    description: 'Define a struct, create a value, and pass it to a function. This example calculates the area of a rectangle.',
    icon: 'm8 5-6 7 6 7m8-14 6 7-6 7',
    code: `<span class="comment">// Define a struct with two fields</span>
<span class="type">Rectangle</span> : <span class="keyword">struct</span> {
    width : <span class="type">i32</span>
    height : <span class="type">i32</span>
}

<span class="comment">// Define a function that uses the struct</span>
<span class="func">area</span> : <span class="keyword">func</span>(rectangle : <span class="type">Rectangle</span>) <span class="operator">-&gt;</span> <span class="type">i32</span> {
    <span class="keyword">return</span> rectangle.width <span class="operator">*</span> rectangle.height
}

<span class="func">main</span> : <span class="keyword">func</span>() <span class="operator">-&gt;</span> <span class="type">i32</span> {
    rectangle : <span class="type">Rectangle</span> = { .width = <span class="number">10</span>, .height = <span class="number">4</span> }
    result := <span class="func">area</span>(rectangle) <span class="comment">// 40</span>
    <span class="keyword">return</span> <span class="number">0</span>
}`,
  },
  ...highlights.map((example, index) => ({ ...example, ...topics[index] })),
];
