/* APPROXIMATE curves for a smooth circular cylinder, read off from the literature.
   Cd: Schlichting, Boundary-Layer Theory; Achenbach (1968); Roshko (1961); Zdravkovich (1997).
   St: Williamson (1996) fit St = -3.3265/Re + 0.1816 + 1.6e-4*Re for 49<Re<178; ~0.2 subcritical;
       ~0.27 post-critical (Roshko 1961, Achenbach & Heinecke 1981). St is ill-defined in the critical range.
   Check against the primary sources before using these numbers for design work. */
window.CDST = {
  cd: [[1,10],[3,5],[10,2.8],[30,1.7],[40,1.55],[100,1.3],[300,1.3],[1e3,1.05],[3e3,1.1],[1e4,1.2],
       [1e5,1.2],[2e5,1.2],[3e5,1.0],[4e5,0.5],[5e5,0.35],[7e5,0.4],[1e6,0.5],[3e6,0.6],[1e7,0.7]],
  st: [ [[47,0.119],[50,0.123],[60,0.136],[80,0.153],[100,0.164],[150,0.183],[178,0.191],[250,0.2],[1e3,0.2],[1e5,0.2],[2e5,0.2]],
        [[4e6,0.27],[1e7,0.27]] ]
};
