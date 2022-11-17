## Sonification in TWO

Each light will be associated with an independent noise source *
when a light is above a certain plane (next, just do the math)
that it is close to in the z(?) dimension (when the above, we can just calc dist)
it takes the planes current frequency* *(ish)
And spawns a number high-Q bandpass filters 
Whose volume are 1/d^2
These filters are released (maybe a timeout after a fade out)
when the light is far from the plane  (easy)
or when the light has left the planes geometry  (hoverPlane != active_plane)

*I dont know what this means, I just know it will be harmonic and change over time