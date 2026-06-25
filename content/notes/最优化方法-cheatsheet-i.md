---
title: "《最优化方法》cheatsheet I"
slug: "最优化方法-cheatsheet-i"
date: "2026-06-25"
lastEditedTime: "2026-06-25T03:46:00.000Z"
category: "study"
tags: ["study"]
status: "Published"
notionPageId: "38adb726-82a8-8016-b405-eeb42f6570f1"
---

## 优化问题的基本概念

### 一般形式

优化问题（optimization problem）的一般形式： min\ f(x),\ s.t.\ x\in X

- x=(x_1,x_2,\dots,x_n)^T ：决策向量（decision vector）
- f:R^n\to R ：目标函数（objective function）
- X\subset R^n ：约束集合（constraint set）或可行域（feasible region）
- 约束集可由 c_i(x)\le 0 和 c_i(x)=0 给出
### 基本术语

- 可行点（feasible point）： x\in X
- 可行域（feasible region）： X
- 最优解（optimal solution） x^* ：对任意 x\in X ，有 f(x^*)\le f(x)
- 最优值（optimal value）： f(x^*)
- 最大化（maximization）可改写为最小化（minimization）： max\ f(x)\iff min(-f(x))
- 若最小值或最大值在 X 上取不到，则考虑下确界（infimum） inf\ f(x) 和上确界（supremum） sup\ f(x)
### 无约束与约束优化

- 无约束优化（unconstrained optimization）： min\ f(x),\ x\in R^n
- 约束优化（constrained optimization）：带有等式约束、不等式约束或其他限制
### 等式约束与不等式约束

- 等式约束（equality constraint）： h(x)=0
- 不等式约束（inequality constraint）： g(x)\le 0
### 全局最优与局部最优

- 全局极小点（global minimum）：若 x\in X 且 f(x)\le f(y) 对所有 y\in X 成立
- 局部极小点（local minimum）：若存在 \varepsilon \-邻域，使得附近可行点都满足 f(x)\le f(y)
- 严格局部极小点（strict local minimum）：若附近所有 y\ne x 都满足 f(x)<f(y)
### 问题类型

- 线性规划（Linear Programming, LP）：目标函数和约束均为线性（linear）
- 非线性规划（Nonlinear Programming, NLP）：目标函数或约束中至少一个是非线性（nonlinear）
- 二次规划（Quadratic Programming, QP）：目标函数是二次函数（quadratic），约束是线性（linear）
- 非光滑优化（non\-smooth optimization）：含非光滑函数（non\-smooth functions）
- 无导数优化（derivative\-free optimization）：导数（derivatives）不可用
- 整数规划（Integer Programming, IP）：变量取整数
- 半定规划（Semidefinite Programming, SDP）：在线性规划下加入半正定约束（semidefinite constraints）
- 其他类型：稀疏优化（sparse optimization）、低秩矩阵优化（low\-rank matrix optimization）、几何优化（geometric optimization）、凸优化（convex optimization）、鲁棒优化（robust optimization）、全局优化（global optimization）、组合优化（combinatorial optimization）、网络流优化（network flow optimization）
### 例：投资组合优化

目标：在尽量增大收益的同时最小化风险。

- x_i ：第 i 个资产（asset）的投资量
- x\in R^n ：整体投资分配（investment allocation）
- 约束可包括：总资金约束、每个资产的最大/最小投资约束、最低收益约束
- 例： min\ \frac12 x^T\Sigma x
- subject to： \mu^T x\ge r_0,\ \sum_i x_i=1,\ x\ge 0
- \Sigma ：协方差矩阵（covariance matrix）
- \mu ：期望收益向量（expected returns vector）
- 这是二次规划（quadratic programming）问题
### 例：稀疏优化

- min\ ||x||_0,\ s.t.\ Ax=b
- min\ ||x||_1,\ s.t.\ Ax=b
- min\ ||x||_2,\ s.t.\ Ax=b
- ||x||_0 ： x 中非零元素个数，非连续（discontinuous），且是 NP\-hard
- ||x||_1=\sum_i |x_i|
- ||x||_2=(\sum_i x_i^2)^{1/2}
- 当 m\ll n 时， Ax=b 是欠定逆问题（underdetermined inverse problem），需要额外先验信息（prior information）；常见假设是真实信号是稀疏的（sparse）
- l_0 优化：组合型（combinatorial）且 NP\-hard
- l_1 优化：凸优化（convex optimization）
- l_2 最小化通常得到稠密解（dense solutions）
- 压缩感知（compressed sensing）中的重要结论：在某些条件下，真实稀疏解也是 min\ ||x||_1,\ s.t.\ Ax=b 的唯一解
### LASSO

- min\ \mu||x||_1+\frac12||Ax-b||_2^2
- \mu>0 ：正则化参数（regularization parameter）
- 同时最小化 l_1 范数和最小二乘误差（least\-squares error）
### 低秩矩阵恢复

- 矩阵补全（matrix completion）问题： min\ rank(X),\ s.t.\ X_{ij}=M_{ij},\ (i,j)\in \Omega
- rank(X) 最小化是 NP\-hard
- 用核范数（nuclear norm）近似： ||X||_* = \sum_i \sigma_i(X)
- 对应凸优化模型： min\ ||X||_*,\ s.t.\ X_{ij}=M_{ij},\ (i,j)\in \Omega
- 正则化形式： min\ \mu||X||_*+\frac12\sum_{(i,j)\in \Omega}(X_{ij}-M_{ij})^2
### 算法收敛

- 迭代算法（iterative algorithm）产生序列 x_k
- 若 lim_{k\to\infty}||x_k-x^*||=0 ，则称算法收敛到最优解
- Q\-线性收敛： \frac{||x_{k+1}-x^*||}{||x_k-x^*||}\le a,\ a\in(0,1)
- Q\-超线性收敛： lim_{k\to\infty}\frac{||x_{k+1}-x^*||}{||x_k-x^*||}=0
- Q\-二次收敛： \frac{||x_{k+1}-x^*||}{||x_k-x^*||^2}\le a,\ a>0
### 收敛判据

- 无约束优化（unconstrained optimization）的常见停止准则： \frac{f(x_k)-f^*}{max(|f^*|,1)}\le \varepsilon_1,\ ||\nabla f(x_k)||\le \varepsilon_2
## 向量范数与矩阵范数

### 向量范数

向量范数（vector norm）是映射： ||\cdot||:R^n\to R_+

并满足：

- 正定性（positive definiteness）： ||v||\ge 0 ，且 ||v||=0 \iff v=0
- 齐次性（homogeneity）： ||\alpha v||=|\alpha|\,||v||
- 三角不等式（triangle inequality）： ||v+w||\le ||v||+||w||
### 常见向量范数

- l_1 范数： ||x||_1=\sum_i |x_i|
- l_2 范数： ||x||_2=(\sum_i x_i^2)^{1/2}
- l_\infty 范数： ||x||_\infty=\max_i |x_i|
### 几何含义

- 向量范数度量向量到原点的距离
- l_1 范数：强调分量绝对值总和，适合刻画稀疏性（sparsity）或分量累积误差
- l_2 范数：欧氏距离（Euclidean distance）
- l_\infty 范数：最大分量偏差（worst\-case deviation）
### Cauchy\-Schwarz 不等式

对任意 a,b\in R^n ：

|a^Tb|\le ||a||_2\,||b||_2

当且仅当 a,b 线性相关（linearly dependent）时取等号。

### 矩阵范数

矩阵范数（matrix norm）是向量范数的自然推广。

对 A=(A_{ij})\in R^{m\times n} ：

- Frobenius 范数： ||A||_F=(\sum_{i,j} A_{ij}^2)^{1/2}
- 元素绝对值和： \sum_{i,j}|A_{ij}|
### 算子范数

由向量范数诱导的算子范数（operator norm）定义为：

||A||_{(m,n)}=\max_{x\in R^n,\ ||x||_{(n)}=1} ||Ax||_{(m)}

### 重要特殊情形

- 列和范数（maximum absolute column sum）： ||A||_1=\max_{1\le j\le n}\sum_{i=1}^m |a_{ij}|
- 谱范数（spectral norm）： ||A||_2=\sqrt{\lambda_{\max}(A^TA)}
- 行和范数（maximum absolute row sum）： ||A||_\infty=\max_{1\le i\le m}\sum_{j=1}^n |a_{ij}|
### 核范数与矩阵内积

设 \sigma_1,\dots,\sigma_r 是 A 的非零奇异值（singular values），其中 r=rank(A) 。

- 核范数（nuclear norm）： ||A||_*=\sum_{i=1}^r \sigma_i
对 A,B\in R^{m\times n} ，矩阵内积（matrix inner product）定义为：

\langle A,B\rangle = Tr(AB^T)=\sum_{i=1}^m\sum_{j=1}^n a_{ij}b_{ij}

这等价于把矩阵看成向量后的欧氏内积。

### 矩阵形式的 Cauchy\-Schwarz 不等式

对任意 A,B\in R^{m\times n} ：

|\langle A,B\rangle|\le ||A||_F\,||B||_F

当且仅当 A,B 线性相关时取等号。

此外，Frobenius 范数满足： ||A||_F=\sqrt{\langle A,A\rangle}

## 仿射集合、凸集与凸锥

### 仿射组合与仿射包

- 仿射组合（affine combination）： x=\theta_1x_1+\theta_2x_2+\cdots+\theta_kx_k ，其中 \sum_{i=1}^k\theta_i=1
- 仿射包（affine hull）： aff(S) ，表示包含 S 的最小仿射集合
### 仿射集合

- 仿射集合（affine set）：若 x_1,x_2\in C ，则对任意 \theta\in R ，有 \theta x_1+(1-\theta)x_2\in C
- 几何含义：包含两点确定的整条直线
- 例： Ax=b 的解集是仿射集合
### 凸组合与凸包

- 凸组合（convex combination）： x=\theta_1x_1+\cdots+\theta_kx_k ，其中 \theta_i\ge 0 且 \sum_{i=1}^k\theta_i=1
- 凸包（convex hull）： conv(S) ，表示包含 S 的最小凸集
### 凸集

- 凸集（convex set）：若 x_1,x_2\in C ，则对任意 \theta\in [0,1] ，有 \theta x_1+(1-\theta)x_2\in C
- 几何含义：两点连线段仍在集合中
- 仿射集一定是凸集
### 锥组合、锥与凸锥

- 锥组合（conic combination）： x=\theta_1x_1+\cdots+\theta_kx_k ，其中 \theta_i\ge 0
- 锥（cone）：若 x\in K 且 \lambda\ge 0 ，则 \lambda x\in K
- 凸锥（convex cone）：若 x,y\in K 且 \alpha,\beta\ge 0 ，则 \alpha x+\beta y\in K
- 锥包（conic hull）： cone(S)
### 三种组合的比较

- 仿射组合：系数和为 1 ，系数可正可负
- 凸组合：系数和为 1 ，系数非负
- 锥组合：系数非负，但不要求和为 1
### 常见例子与性质

- 半空间（halfspace）、超平面（hyperplane）、球（ball）、椭球（ellipsoid）、多面体（polyhedron）都是凸集
- 二阶锥（second\-order cone）： Q^{n+1}=\{(x,t): ||x||_2\le t,\ t\ge 0\}
- 凸集的交集仍为凸集
- 若 S,T 是凸集，则 S+T 是凸集
### 仿射变换与分式线性变换

- 仿射变换（affine transformation）： f(x)=Ax+b
- 若 S 是凸集，则 f(S) 是凸集；若 C 是凸集，则 f^{-1}(C) 是凸集
- 关键关系： f(\theta x+(1-\theta)y)=\theta f(x)+(1-\theta)f(y)
- 透视变换（perspective transformation）： P(x,t)=x/t ，其中 t>0
- 分式线性变换（fractional linear transformation）： f(x)=(Ax+b)/(c^Tx+d) ，其中 c^Tx+d>0
- 透视变换与分式线性变换都保持凸性的像与原像
## 凸函数与最优性基础

### 凸函数、凹函数、严格凸函数

- 凸函数（convex function）： f(\theta x+(1-\theta)y)\le \theta f(x)+(1-\theta)f(y) ，其中 \theta\in [0,1]
- 凹函数（concave function）： f 凹当且仅当 -f 凸
- 严格凸函数（strictly convex）：当 x\ne y 且 0<\theta<1 时， f(\theta x+(1-\theta)y)<\theta f(x)+(1-\theta)f(y)
### 常见例子

- 仿射函数 a^Tx+b ：既凸又凹
- e^x ：凸
- \log x ：在 (0,\infty) 上凹
- |x| ：凸，但在 0 处不可导
- x\log x ：在 (0,\infty) 上凸
- 范数（norm）是凸函数
### 强凸性

- 强凸（strongly convex）：若存在 m>0 ，使 g(x)=f(x)-\frac{m}{2}||x||_2^2 为凸函数，则 f 是 $$m$$\-强凸
- 强凸函数若有极小点，则极小点唯一
### 判别工具

- 直线限制： f 凸当且仅当对任意 x,v ，函数 g(t)=f(x+tv) 关于 t 是凸的
- 一阶条件： f 凸当且仅当 f(y)\ge f(x)+\nabla f(x)^T(y-x)
- 梯度单调性： f 凸当且仅当 (\nabla f(x)-\nabla f(y))^T(x-y)\ge 0
- 二阶条件：若 f 二次连续可微，则 f 凸当且仅当 \nabla^2 f(x)\succeq 0
- 若 \nabla^2 f(x)\succ 0 ，则 f 严格凸
### 二次函数

- 二次函数： f(x)=\frac12 x^TPx+q^Tx+r
- 有 \nabla f(x)=Px+q ， \nabla^2 f(x)=P
- 因而 f 凸当且仅当 P\succeq 0
### 无约束最优性条件

- 一阶必要条件（first\-order necessary condition）：若 x^* 是局部极小点，则 \nabla f(x^*)=0
- 二阶必要条件（second\-order necessary condition）： \nabla^2 f(x^*)\succeq 0
- 二阶充分条件（second\-order sufficient condition）：若 \nabla f(x^*)=0 且 \nabla^2 f(x^*)\succ 0 ，则 x^* 是严格局部极小点
### 凸优化中的结论

- 凸优化中，局部极小点就是全局极小点
- 严格凸函数至多有一个全局极小点
- 非凸问题中，一阶条件只给出 stationary point，不保证全局最优
